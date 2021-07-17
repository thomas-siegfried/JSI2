import { FactoryMethod } from "./Interface";
export interface ILifetimeManager {
    GetFactory(factory: any): FactoryMethod;
}
//lifecycle manager that maintains a singleton, which is the default behavior anyway
export class SingletonLifetimeManager implements ILifetimeManager {
    GetFactory(factory: any) {
        var instance = factory();
        return () => instance;
    }
}
//provides a new object on each request
export class PerRequestLifetimeManager implements ILifetimeManager {
    GetFactory(factory: any) {
        return factory;
    }
}