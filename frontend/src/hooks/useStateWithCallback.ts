import { useState, useCallback } from 'react';

type SetStateAction<S> = S | ((prevState: S) => S);
type CallbackFunction<S> = (state: S) => void;

export function useStateWithCallback<S>(
  initialState: S | (() => S)
): [S, (state: SetStateAction<S>, callback?: CallbackFunction<S>) => void] {
  const [state, setState] = useState(initialState);

  const setStateCallback = useCallback(
    (stateAction: SetStateAction<S>, callback?: CallbackFunction<S>) => {
      setState((prevState) => {
        const newState = typeof stateAction === 'function' 
          ? (stateAction as (prevState: S) => S)(prevState)
          : stateAction;
        
        if (callback) {
          callback(newState);
        }
        
        return newState;
      });
    },
    []
  );

  return [state, setStateCallback];
}
