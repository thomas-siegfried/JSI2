export * from "./Injector.js";
export * from "./Decorators.js";
export * from "./Utilities.js";
export * from "./Lifetime.js";
export * from "./Lazy.js";
export * from "./Interface.js";
import { Inject, InjectParam } from "./Decorators.js";
import { Injector } from "./Injector.js";

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
