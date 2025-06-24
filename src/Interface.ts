import {
  ResolveCallbacks,
  Registration,
  IRegistrationCallback,
  Resolution,
  Util,
  RegisterOptions,
} from "./Utilities";

import { ProxyBuilder } from "./Proxy";
import { Injector } from "./Injector";

export interface IInjector {
  //key,dependencies,factory,lifetimemanager,instance
  //init could be a flag on options, init and lifetime could be a prop on Register

  RegisterOptions(options: RegisterOptions): Registration;
  Register(key: any, dependencies: any[], factory: any): Registration;

  RegisterInstance(key: any, value: any): Registration;
  //add dependencies here
  RegisterTransient(key: any, dependencies: any[], factory: any): Registration;
  RegisterPerContext(key: any, dependencies: any[], factory: any): Registration;
  //just call the register options with the init bit set
  RegisterAutoInit(options: RegisterOptions): void;

  RegisterCallback(callback: IRegistrationCallback);
  Resolve<T>(key: Constructor<T>): T;
  Resolve<T = any>(key: string): T;
  ChildScope(): IInjector;
  Proxy(key: any): ProxyBuilder;

  //rename this, conflicts with RegisterCallback
  callbacks: ResolveCallbacks;
  initialize(init: any);
  EnsureInitialized();
  //create a scoped child context
  CreateScopedContext(): Injector;
}

export type FactoryMethod<T> = (...params: any[]) => T;

export type Constructor<T> = new (...args: any[]) => T;

export interface ResolverFactoryMethod {
  (injector?: Injector): any;
}
