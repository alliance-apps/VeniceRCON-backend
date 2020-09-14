import { StateService } from "./StateService"
const { Type } = StateService

const instance = <StateService.ObjectState>{
  type: Type.OBJECT,
  state: {
    name: Type.STRING,
    slots: Type.NUMBER,
    totalSlots: Type.NUMBER,
    mode: Type.STRING,
    map: Type.STRING,
    roundsPlayed: Type.NUMBER,
    //scores: { type: Type.ARRAY, state: Type.NUMBER } as StateService.Type.ARRAY,
    targetScore: Type.NUMBER,
    onlineState: Type.STRING,
    ranked: Type.BOOLEAN,
    punkBuster: Type.BOOLEAN,

  }
}

const instances: StateService.ArrayState = {
  type: Type.ARRAY,
  state: instance
}


const state = new StateService({
  state: {

  }
})