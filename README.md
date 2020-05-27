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

|       scope           |  bit    | description
|---------------------- | ------- | --------------------
| `INSTANCE#ACCESS`     | `0x01`  | read access for an instance
| `INSTANCE#CREATE`     | `0x02`  | create an instance
| `INSTANCE#UPDATE`     | `0x04`  | modify an instance
| `INSTANCE#DELETE`     | `0x08`  | delete an instance
| `INSTANCEUSER#ACCESS` | `0x100` | read access for an instance
| `INSTANCEUSER#CREATE` | `0x200` | create invite tokens for an instance
| `INSTANCEUSER#UPDATE` | `0x400` | update permissions from an instace
| `INSTANCEUSER#REMOVE` | `0x800` | remove users from an instance

## Socket Rooms

## Default

> INSTANCE#ADD

socket got added to an instance data received is same as `/api/instances/{instanceId}`

```javascript
socket.on("INSTANCE#ADD", state => {
  socket.join("")
})
```

## INSTANCE

**room name** `INSTANCE#{instanceId}`

### Events

> remove

event gets fired when either the instance has been deleted or permissions have been withdrawn