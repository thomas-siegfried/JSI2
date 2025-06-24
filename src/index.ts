export * from "./Injector";
export * from "./Decorators";
export * from "./Utilities";
export * from "./Lifetime";
export * from "./Lazy";
export * from "./Interface";
import { Inject, InjectParam } from "./Decorators";
import { Injector } from "./Injector";

//capture global context

//root injector
export const Root = new Injector(null, globalThis);

//default export includes reference to root injector
export default {
  Root,
  Injector,
  Inject,
  InjectParam,
};
