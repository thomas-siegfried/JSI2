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
  RegisterTransient(key: any, factory: any, dependencies: any[]): Registration;
  RegisterPerContext(key: any, factory: any, dependencies: any[]): Registration;
  //just call the register options with the init bit set
  RegisterAutoInit(options: RegisterOptions): void;

  RegisterCallback(callback: IRegistrationCallback);
  Resolve<T>(key: any): T;
  ChildScope(): IInjector;
  Proxy(key: any): ProxyBuilder;

  //rename this, conflicts with RegisterCallback
  callbacks: ResolveCallbacks;
  initialize(init: any);
  EnsureInitialized();
  //create a scoped child context
  CreateScopedContext(): Injector;
}

export interface FactoryMethod {
  (...params: any[]): any;
}

export interface Constructor<T> {
  new (...args: any[]): T;
}

export interface ResolverFactoryMethod {
  (injector?: Injector): any;
}
