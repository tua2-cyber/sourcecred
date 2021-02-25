// @flow

import findLast from "lodash.findlast";
import {type IdentityId, identityIdParser} from "../identity/id";
import type {TimestampMs} from "../../util/timestamp";
import * as C from "../../util/combo";

export type PersonalAttributionProportion = {|
  +timestampMs: TimestampMs,
  +proportionValue: number,
|};
export type PersonalAttribution = {|
  +fromParticipantId: IdentityId,
  +toParticipantId: IdentityId,
  +proportions: $ReadOnlyArray<PersonalAttributionProportion>,
|};
export type PersonalAttributions = $ReadOnlyArray<PersonalAttribution>;
export const personalAttributionsParser: C.Parser<PersonalAttributions> = C.array(
  C.object({
    fromParticipantId: identityIdParser,
    toParticipantId: identityIdParser,
    proportions: C.array(
      C.object({timestampMs: C.number, proportionValue: C.number})
    ),
  })
);

type GroupedPersonalAttributions = PersonalAttributions;
export class PersonalAttributionsMap {
  _map: $ReadOnlyMap<IdentityId, GroupedPersonalAttributions>;

  constructor(
    personalAttributions: PersonalAttributions,
    epochStarts: $ReadOnlyArray<TimestampMs>
  ) {
    // Validate that:
    // 1. There is only 1 entry per [fromParticipantId, toParticipantId] pair.
    // 2. Proportions are in chronological order.
    // 3. Proportions are a number between 0 and 1.
    const identityPairs = new Set();
    for (const pa of personalAttributions) {
      if (identityPairs.has([pa.fromParticipantId, pa.toParticipantId]))
        throw `More than one attribution found from [${pa.fromParticipantId}] to [${pa.toParticipantId}]`;
      identityPairs.add([pa.fromParticipantId, pa.toParticipantId]);
      pa.proportions.forEach((proportion, index) => {
        if (
          index > 0 &&
          proportion.timestampMs < pa.proportions[index - 1].timestampMs
        )
          throw `Personal Attribution proportions not in chronological order for [${pa.fromParticipantId}] to [${pa.toParticipantId}]`;
        if (proportion.proportionValue < 0 || 1 < proportion.proportionValue)
          throw `Personal Attribution proportion value must be between 0 and 1, inclusive. Found [${proportion.proportionValue}].`;
      });
    }
    // Convert the array into a fromParticipantId-indexed map
    // for improved lookup efficiency.
    this._map = personalAttributions.reduce((map, personalAttribution) => {
      let array = map.get(personalAttribution.fromParticipantId);
      if (!array) {
        array = [];
        map.set(personalAttribution.fromParticipantId, array);
      }
      array.push(personalAttribution);
      return map;
    }, new Map());
    // Validate that no participant is attributing more than 100% of their cred
    // in any epoch.
    for (const groupedAttributions of this._map.values()) {
      for (const epochStart of epochStarts) {
        const sum = this._getSumProportionValue(
          epochStart,
          groupedAttributions
        );
        if (sum && sum > 1)
          throw `Sum of Personal Attributions for epoch [${epochStart}] is greater than 1. Found: [${sum}].`;
      }
    }
  }

  toPersonalAttributions(): PersonalAttributions {
    return Array.from(this._map.values()).flat(1);
  }

  recipientsForEpochAndParticipant(
    epochStart: TimestampMs,
    fromParticipantId: IdentityId
  ): $ReadOnlyArray<IdentityId> {
    const personalAttributions = this._map.get(fromParticipantId);
    if (!personalAttributions) return [];
    return personalAttributions
      .filter(({proportions}) =>
        this._getProportionValue(epochStart, proportions)
      )
      .map(({toParticipantId}) => toParticipantId);
  }

  getProportionValue(
    epochStart: TimestampMs,
    fromParticipantId: IdentityId,
    toParticipantId: IdentityId
  ): number | null {
    const personalAttributions = this._map.get(fromParticipantId);
    if (!personalAttributions)
      throw `Could not find PersonalAttributions from [${fromParticipantId}]`;

    const personalAttribution = personalAttributions.find(
      (pa) => pa.toParticipantId === toParticipantId
    );
    if (!personalAttribution)
      throw `Could not find PersonalAttribution from [${fromParticipantId}] to [${toParticipantId}]`;

    return this._getProportionValue(
      epochStart,
      personalAttribution.proportions
    );
  }

  _getProportionValue(
    epochStart: TimestampMs,
    proportions: $ReadOnlyArray<PersonalAttributionProportion>
  ): number | null {
    if (proportions.length && epochStart < proportions[0].timestampMs)
      return null;
    const relevantProportion = findLast(
      proportions,
      (proportion) => proportion.timestampMs < epochStart
    );
    return relevantProportion ? relevantProportion.proportionValue : null;
  }

  getSumProportionValue(
    epochStart: TimestampMs,
    fromParticipantId: IdentityId
  ): number | null {
    const personalAttributions = this._map.get(fromParticipantId);
    if (!personalAttributions) return null;
    return this._getSumProportionValue(epochStart, personalAttributions);
  }

  _getSumProportionValue(
    epochStart: TimestampMs,
    personalAttributions: GroupedPersonalAttributions
  ): number | null {
    const proportionValues = personalAttributions
      .map(({proportions}) => this._getProportionValue(epochStart, proportions))
      .filter((proportionValue) => proportionValue !== null);
    if (proportionValues.length === 0) return null;
    return proportionValues.reduce((a, b) => (b ? a + b : a), 0);
  }
}
