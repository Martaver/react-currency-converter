// export class ActionCreator<T, P> {
//   readonly type: T;
//   readonly payload: P;

//   constructor(type: T) { this.type = type; }
//   create = (payload: P) => ({ type: this.type, payload });
// }

export type Action<T, P> = {
  type: T, payload: P,
};

export type ActionCreator<T, P> = {
  type: T, (payload: P): Action<T, P>,
};

export function createActionCreator<T, P>(type: T) {
  const actionCreator: ActionCreator<T, P> = (
    (payload: P) => ({ type: actionCreator.type, payload })
  ) as ActionCreator<T, P>;
  actionCreator.type = type;
  return actionCreator;
}
