export type EmptyActionCreator<T extends string> = {
  (): { type: T }, type: T,
};

export type PayloadActionCreator<T extends string, P> = {
  (payload: P): { type: T, payload: P }, type: T,
};

export type PayloadSelector<P> = (payload: P) => P;

export function createActionCreator<T extends string, P>(
  type: T, payloadSelector: PayloadSelector<P>,
): PayloadActionCreator<T, P>;
export function createActionCreator<T extends string>(
  type: T,
): EmptyActionCreator<T>;
export function createActionCreator<T extends string, P>(
  type: T, payloadSelector?: PayloadSelector<P>,
): PayloadActionCreator<T, P> | EmptyActionCreator<T> {
  if (payloadSelector == null) {
    const actionCreator = (
      (payload: P) => ({ type })
    ) as EmptyActionCreator<T>;
    actionCreator.type = type;
    return actionCreator;
  } else {
    const actionCreator = (
      (payload: P) => ({ type, payload: payloadSelector(payload) })
    ) as PayloadActionCreator<T, P>;
    actionCreator.type = type;
    return actionCreator;
  }
}
