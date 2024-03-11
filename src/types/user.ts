export interface UserType {
    name: string;
    number: string;
    bio: string;
    birth: string;
  }

  export type User = UserType | null;

  export type UserActionTypes = 'SET_USER' | 'CLEAR_USER';

  export interface SetUserAction {
    type: 'SET_USER';
    payload: User;
  }

  export interface ClearUserAction {
    type: 'CLEAR_USER';
  }

  export type UserAction = SetUserAction | ClearUserAction;
