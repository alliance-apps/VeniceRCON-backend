# Venice Rcon Backend

RCON Backend to connect to Battlefield / VeniceUnleashed Instances

# Installation

```bash
#install dependencies
npm install

#install ts-node globally
sudo npm install -g ts-node

#copy the default config.default.yaml to config.yaml
#and edit the configuration to your needs
cp config.default.yaml config.yaml

#start the tool with
npm start
```

# Permission Scopes

|       scope           |  bit         | description
|---------------------- | ------------ | --------------------
| `INSTANCE#ACCESS`     | `0x01`       | read access for an instance
| `INSTANCE#CREATE`     | `0x02`       | create an instance
| `INSTANCE#UPDATE`     | `0x04`       | modify an instance
| `INSTANCE#DELETE`     | `0x08`       | delete an instance
| `INSTANCEUSER#ACCESS` | `0x100`      | read access for an instance
| `INSTANCEUSER#CREATE` | `0x200`      | create invite tokens for an instance
| `INSTANCEUSER#UPDATE` | `0x400`      | update permissions from an instace
| `INSTANCEUSER#REMOVE` | `0x800`      | remove users from an instance
| `BAN#ACCESS`          | `0x010000`   | view the current ban list
| `BAN#CREATE`          | `0x020000`   | create bans
| `BAN#DELETE`          | `0x040000`   | remove bans
| `PLAYER#KILL`         | `0x01000000` | kill a player
| `PLAYER#KICK`         | `0x02000000` | kick a player


# Socket Events

> INSTANCE#ADD

```javascript
/**
 * socket got added to an instance
 * @property {object} event
 * @property {number} event.id the instance which has been changed
 * @property {object} event.state current state of the instance
 */
socket.on("INSTANCE#ADD", event => {
  console.log("got added to instance", event.id, event.state.serverinfo.name)
})
```


> INSTANCE#UPDATE

```javascript
/**
 * instance property has been changed inside the state
 * @property {object} event
 * @property {number} event.id the instance which has been changed
 * @property {[string, string|number|boolean|undefined|(number|string|boolean)[]][]>} event.changes
 */
socket.on("INSTANCE#UPDATE", event => {
  console.log(`received updates for instance with id ${event.id}`, event.changes)
})
```


> INSTANCE#REMOVE

```javascript
/**
 * removed instance, either permissions have been revoked or instance has been deleted
 * @property {object} event
 * @property {number} event.id the instance which should get removed
 */
socket.on("INSTANCE#REMOVE", event => {
  console.log(`removed from instance ${event.id}`)
})
```

> SELF#PERMISSION_UPDATE

```javascript
/**
 * gets fired when own permissions have been updated
 */
socket.on("SELF#PERMISSION_UPDATE", () => {
  //get new permissions via /api/auth/whoami
})
```