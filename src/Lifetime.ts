import { Injector } from "./Injector.js";
import { FactoryMethod, ResolverFactoryMethod } from "./Interface.js";

export interface ILifetimeManager {
  GetFactory(factory: any): ResolverFactoryMethod;
}
//lifecycle manager that maintains a singleton, which is the default behavior anyway
export class SingletonLifetimeManager implements ILifetimeManager {
  GetFactory(factory: any): ResolverFactoryMethod {
    var instance = factory();
    return () => instance;
  }
}
//provides a new object on each request
export class PerRequestLifetimeManager implements ILifetimeManager {
  GetFactory(factory: any): ResolverFactoryMethod {
    return factory;
  }
}

export class PerContextLifetimeManager implements ILifetimeManager {
  GetFactory(factory: any): ResolverFactoryMethod {
    var map = new WeakMap();
    return (inj: Injector) => {
      //singleton per context
      if (map.has(inj)) {
        return map.get(inj);
      } else {
        var val = factory();
        map.set(inj, val);
        return val;
      }
    };
  }
}
