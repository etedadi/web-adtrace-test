type Nullable<T> = T | null

type Maybe<T> = T | undefined

interface Window {
  indexedDB: Maybe<IDBFactory>
  mozIndexedDB: Maybe<IDBFactory>
  webkitIndexedDB: Maybe<IDBFactory>
  msIndexedDB: Maybe<IDBFactory>
}

interface IDBVersionChangeEventTarget extends EventTarget {
  result: IDBDatabase
  transaction: IDBTransaction
}

interface IDBVersionChangeEvent {
  target: IDBVersionChangeEventTarget
}

interface IDBOpenDBEventTarget extends EventTarget {
  result: IDBDatabase | null
}

interface IDBOpenDBEvent extends Event {
  target: IDBOpenDBEventTarget
}

interface IDBOpenDBRequest {
  onsuccess: ((this: IDBOpenDBRequest, ev: IDBOpenDBEvent) => any) | null;
}

interface OpenIDBCursorEventTarget extends EventTarget {
  result: IDBCursorWithValue | null
}

interface OpenIDBCursorEvent extends Event {
  target: OpenIDBCursorEventTarget
}

interface OpenIDBCursorRequest extends IDBRequest<IDBCursorWithValue | null> {
  onsuccess: ((this: OpenIDBCursorRequest, ev: OpenIDBCursorEvent) => any) | null;
}
