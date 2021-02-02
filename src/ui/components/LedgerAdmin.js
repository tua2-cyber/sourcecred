// @flow

import React, {
  useCallback,
  useState,
  useEffect,
  type Node as ReactNode,
} from "react";
import {makeStyles} from "@material-ui/core/styles";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import {
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  TextField,
} from "@material-ui/core";
import {useLedger} from "../utils/LedgerContext";
import {IdentityMerger} from "./IdentityMerger";
import {type Identity, type IdentityId} from "../../core/identity";
import {AliasView} from "./AliasView";

import * as NullUtil from "../../util/null";
import {fromString as uuidFromString} from "../../util/uuid";

const useStyles = makeStyles((theme) => {
  return {
    root: {
      color: theme.palette.text.primary,
      width: "100%",
      maxWidth: "50em",
      padding: "0 5em 5em",
    },
    identityList: {
      backgroundColor: theme.palette.background.paper,
      width: "100%",
      marginTop: theme.spacing(3),
      overflow: "auto",
      maxHeight: 500,
    },
    centerRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    updateElement: {
      flexGrow: 2,
      flexBasis: theme.spacing(5),
      margin: theme.spacing(3, 0),
    },
    checkboxElement: {flexGrow: 1, flexBasis: 0, margin: theme.spacing(3)},
    IdentitiesHeader: {margin: theme.spacing(3, 0)},
    listSubheader: {
      display: "grid",
      gridTemplateColumns: "auto auto",
      justifyContent: "space-between",
    },
  };
});

export const LedgerAdmin = (): ReactNode => {
  const {ledger, updateLedger} = useLedger();

  const classes = useStyles();
  const [nextIdentityName, setIdentityName] = useState<string>("");
  const [selectedId, setSelectedId] = useState<IdentityId | null>(null);
  const [promptString, setPromptString] = useState<string>("Add Identity:");
  const [isChecked, setIsChecked] = useState<Object>(false);

  const handleSingleCheck = useCallback(
    (event: SyntheticInputEvent<HTMLInputElement>) => {
      const id = event.currentTarget.id;
      const checked = event.currentTarget.checked;

      const uuid = uuidFromString(id);
      toggleIdentityActivation(uuid);

      setIsChecked({...isChecked, [id]: checked});
    }
  );

  const changeIdentityName = (event: SyntheticInputEvent<HTMLInputElement>) =>
    setIdentityName(event.currentTarget.value);

  const createOrUpdateIdentity = () => {
    if (!selectedId) {
      const newID = ledger.createIdentity("USER", nextIdentityName);
      setActiveIdentity(ledger.account(newID).identity);
    } else {
      ledger.renameIdentity(selectedId, nextIdentityName);
    }
    updateLedger(ledger);
  };

  const toggleIdentityActivation = (id: IdentityId) => {
    let nextLedger;
    if (ledger.account(id).active) {
      nextLedger = ledger.deactivate(id);
    } else {
      nextLedger = ledger.activate(id);
    }
    updateLedger(nextLedger);
  };

  const resetIdentity = () => {
    setIdentityName("");
    setSelectedId(null);
    setPromptString("Add Identity: ");
  };

  const setActiveIdentity = (identity: Identity) => {
    setIdentityName(identity.name);
    setSelectedId(identity.id);
    setPromptString("Update Identity: ");
  };

  useEffect(() => {
    const identities = {};

    ledger.accounts().map(({identity, active}) => {
      identities[`${identity.id}`] = active;
    });

    setIsChecked(identities);
  }, [ledger]);

  const renderIdentities = () => {
    const renderIdentity = (i: Identity, notLastElement: boolean) => (
      <>
        <ListItem button onClick={() => setActiveIdentity(i)} key={i.id}>
          <ListItemText primary={i.name} />
          <Checkbox
            onChange={handleSingleCheck}
            checked={Boolean(isChecked[i.id])}
            id={i.id}
            name="active"
            color="primary"
          />
        </ListItem>
        {notLastElement && <Divider />}
      </>
    );
    const numAccounts = ledger.accounts().length;

    return (
      <>
        {ledger
          .accounts()
          .map((a) => a.identity)
          .map((identity, index) =>
            renderIdentity(identity, index < numAccounts - 1)
          )}
      </>
    );
  };

  return (
    <Container className={classes.root}>
      <span className={classes.centerRow}>
        <h1 className={classes.IdentitiesHeader}>Identities</h1>{" "}
        {ledger.accounts().length > 0 && <h3> (click one to update it)</h3>}
      </span>
      <h3>{promptString}</h3>
      <div className={classes.centerRow}>
        <TextField
          fullWidth
          className={classes.updateElement}
          variant="outlined"
          type="text"
          onChange={changeIdentityName}
          value={nextIdentityName}
          label={"Name"}
        />
        {selectedId && (
          <FormControlLabel
            fullWidth
            className={classes.checkboxElement}
            control={
              <Checkbox
                checked={NullUtil.orElse(isChecked[selectedId], false)}
                name="active"
                color="primary"
              />
            }
            label="Account is active"
          />
        )}
      </div>
      <ButtonGroup color="primary" variant="contained">
        <Button onClick={createOrUpdateIdentity}>
          {selectedId ? "update username" : "create identity"}
        </Button>
        <Button
          onClick={() => {
            fetch("data/ledger.json", {
              headers: {
                Accept: "text/plain",
                "Content-Type": "text/plain",
              },
              method: "POST",
              body: ledger.serialize(),
            });
          }}
        >
          save ledger to disk
        </Button>
        {selectedId && <Button onClick={resetIdentity}>New identity</Button>}
      </ButtonGroup>
      {selectedId && (
        <>
          <AliasView selectedId={selectedId} />
          <IdentityMerger selectedId={selectedId} />
        </>
      )}
      <div className={classes.centerRow}>
        <List
          fullWidth
          subheader={
            <ListSubheader>
              <div className={classes.listSubheader}>
                <div>Participant</div>
                <div>Active</div>
              </div>
            </ListSubheader>
          }
          className={classes.identityList}
        >
          <Divider />
          {renderIdentities()}
        </List>
      </div>
    </Container>
  );
};
