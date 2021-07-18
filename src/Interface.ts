import {ResolveCallbacks,Registration,IRegistrationCallback
    ,Resolution,Util,RegisterOptions} from './Utilities';

import { ProxyBuilder } from './Proxy';

export interface IInjector{
    //key,dependencies,factory,lifetimemanager,instance
    //init could be a flag on options, init and lifetime could be a prop on Register

    RegisterOptions(options: RegisterOptions): Registration;
    Register(key: any, dependencies: any[], factory: any): Registration

    RegisterInstance(key: any, value: any): Registration;
    //add dependencies here
    RegisterTransient(key:any,factory:any,dependencies:any[]): Registration;
    //just call the register options with the init bit set
    RegisterAutoInit(options: RegisterOptions): void;
    
    RegisterCallback(callback: IRegistrationCallback);
    Resolve<T>(key: any): T;
    ResolveT<T>(key:Constructor<T>):T;
    ChildScope(): IInjector;
    Proxy(key:any):ProxyBuilder;

    //rename this, conflicts with RegisterCallback
    callbacks:ResolveCallbacks;
    initialize(init: any);
    EnsureInitialized();
}


export interface FactoryMethod {
    (...params: any[]): any;
}

export interface Constructor<T>{
    new (...args:any[]):T;
}