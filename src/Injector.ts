import {ResolveCallbacks,Registration,IRegistrationCallback
    ,Resolution,Util,RegisterOptions} from './Utilities';
import {lifetimeSymbol} from './Symbols';
import {initializeObject} from './Initializers';
import { ProxyFactory,ProxyBuilder } from './Proxy';
import {Constructor, IInjector} from './Interface';
import { ILifetimeManager,SingletonLifetimeManager,PerRequestLifetimeManager } from './Lifetime';
export class Injector implements IInjector {

    constructor(public Parent: Injector = null,public _global:any=null) {
        this.callbacks=new ResolveCallbacks();
    }
    private initialized: boolean;
    callbacks:ResolveCallbacks;
    private Registrations: Map<any,Registration> = new Map();
    private Resolutions: Map<any,any> = new Map();
    private BuildStack: any[] = new Array<any>(); //stack a items being resolved
    private AutoInitRegistrations: any[] = new Array<any>(); //registrations that need to be resolved at startup
    //callbacks used to register types  These get called on first require, because definie init is processed
    private RegistrationCallbacks: IRegistrationCallback[] = new Array<IRegistrationCallback>();

    private getKey(providedKey: any): string {
        return providedKey;
    }

    //pulls resolution off of our resolutions, or some other scope object
    private getResolution(key: any, scope: any = null): Resolution {
        scope = scope || this.Resolutions;
        if(scope instanceof Map){
            if(scope.has(key)){
                return scope.get(key);
            }
        }
        //its just an object
        if (scope[key]) {
            var value = <Resolution>scope[key];
            return value;
        }
        return undefined;
    }
    //resolve an array of keys
    private resolveDependencies(dependencies: any[]) {
        dependencies = dependencies || [];
        var values: any[] = [];
        dependencies.forEach((key) => {
            var value = this.Resolve(key);
            values.push(value);
        });
        return values;

    }
    
    //register all the key/value pairs 
    public initialize(init: any) {
        var keys = Object.keys(init);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = init[key];
            this.RegisterInstance(key, value);
        }
    }

    //create an object from the registration
    private CreateFromRegistration(registration: Registration): Resolution {
        var factory;
        if (registration.Instance) {
            var instance = registration.Instance;
            factory = () => instance;
        } else {
            var dependencyKeys = registration.Dependencies;
            if (!dependencyKeys) {
                dependencyKeys = this.GetDependenciesFromType(registration.Factory);
            }
            var dependencyValues = this.resolveDependencies(dependencyKeys);

            var factory = this.CreateFromFactoryMethod.bind(this, registration.Factory, dependencyValues);

            var lm = registration.LifetimeManager || new SingletonLifetimeManager();
            if (lm) {
                //create a resolution
                factory = lm.GetFactory(factory);
            }
        }
        return new Resolution(factory);

    }

    //invokes the factory method, either using the return value or *this* reference constructor style
    private CreateFromFactoryMethod(factory: any, dependencyValues: any[]): any {
        if (Util.isConstructor(factory)) {
            return new factory(...dependencyValues);
        } else {
            var value = undefined;
            if (factory.prototype)
                value = Object.create(factory.prototype);
            var returnValue = factory.apply(value, dependencyValues);
            value = returnValue || value;
        }
        return value;
    }

    //get definition for the provided key, from local or parent scope
    public GetRegistration(key): Registration {
        if (this.Registrations.has(key)) {
            return this.Registrations.get(key);
        }
        if (this.Parent) {
            return this.Parent.GetRegistration(key);
        }
        return null;
    }

    //Perform one-time setup work before Resolving any dependencies
    //Call all registration callbacks, resolve all InitDefinitions
    public EnsureInitialized() {
        if (!this.initialized) {
            this.initialized = true;
            this.RegistrationCallbacks.forEach((act) => act());
            this.AutoInitRegistrations.forEach((key) => this.Resolve(key));
            if(this.Parent){
                this.Parent.EnsureInitialized();
            }
        }
    }

    private CheckResolveLoop(key: any): void {
        if (this.BuildStack.indexOf(key) > -1) {
            //unsure of the formatting here, just want to have consise logs, if we are resolving types, just write the type name
            var current = key.name ? 'TYPE: ' + key.name : key;
            var prev = this.BuildStack.pop();
            prev = prev.name ? 'TYPE: ' + prev.name : prev;
            throw new Error('require loop detected building ' + current + ' for ' + prev);
        }
    }

    //setup a registration
    public RegisterOptions(options: RegisterOptions): Registration {
        if (!options.Key) {
            throw new Error('Registration must have a key');
        }
        //if the key is a constructor, and we dont have a factory, assume the key is the factory.
        if (!options.Factory && typeof options.Key === 'function') {
            options.Factory = options.Key;
        }
        //replace the key with the derived key
        var reg = new Registration(options);
        if (this.Registrations.has(reg.Key)) {
            throw new Error("key already defined");
        }
        this.Registrations.set(reg.Key, reg);
        if(options.AutoInitialize){
            this.AutoInitRegistrations.push(options.Key);
        }
        return reg;

    }

    //old fashion register
    public Register(key: any, dependencies: any[] = null, factory: any = null): Registration {
        return this.RegisterOptions({ Key: key, Dependencies: dependencies, Factory: factory });
    }

    //register a singleton
    public RegisterInstance(key: any, value: any): Registration {
        return this.RegisterOptions({ Key: key, Instance: value });
    }

    public RegisterTransient(key:any,factory:any=null,dependencies:any[]=null): Registration{
        return this.RegisterOptions({Key:key,Factory:factory,LifetimeManager:new PerRequestLifetimeManager(),Dependencies:dependencies});
    }

    public RegisterCallback(callback: IRegistrationCallback) {
        if (this.initialized) {
            throw new Error('Registration Callback added when injector is already initialized');
        }
        this.RegistrationCallbacks.push(callback);
    }

    //register an init callback
    public RegisterAutoInit(options: RegisterOptions): void {
        //setup key value, can be null
        if (!options.Key) {
            options.Key = {};
        }
        options.AutoInitialize=true;
        this.RegisterOptions(options);
    }


    private GetExistingResolution<T>(key: any): T {
        var _key = this.getKey(key);
        var res = this.getResolution(_key);
        var value: T;
        if (res) {
            value = <T>res.GetInstance();
        }
        return value;
    }

    private ResolveFromExplicitRegistration<T>(key: any): T {
        var _key = this.getKey(key);
        var value: T;
        var reg = this.GetRegistration(_key);
        if (reg) {
            var res = this.CreateFromRegistration(reg);
            this.Resolutions.set(key,res);
            value = <T>res.GetInstance();
        }
        return value;
    }
    private ResolveFromGlobal<T>(key: any) {
        if(!this._global){
           return null;
        }
        var _key = this.getKey(key);
        var value: T;
        value = this._global[_key];
        if (value != undefined) {
            this.Resolutions.set(key,new Resolution(() => value));
        }
        return value;
    }
    //attempt to auto register a type if the key is a type
    private ResolveFromDependentType<T>(key: any): T {
        var value: T;
        if (typeof key === 'function') {
            //create a new registration
            var dep = this.GetDependenciesFromType(key);
            let lifeMgr:ILifetimeManager=null;  //get the lifetime manager from the type
            if(typeof(key[lifetimeSymbol])=='function'){
                lifeMgr= key[lifetimeSymbol]();
            }
            this.RegisterOptions({ Key: key, Factory: key, Dependencies: dep,LifetimeManager:lifeMgr });
            value = this.ResolveFromExplicitRegistration<T>(key);
        }
        return value;
    }

    private ResolveInjector(key:any):Injector{
        if(key==Injector){
            return this;
        }
        return null;
    }

    private GetDependenciesFromType(key: any) {
        if (typeof key === 'function') {
            //resolve inject params from symbol
            var injectTypes = Reflect.getMetadata('inject:paramtypes', key);
            if(injectTypes){
                return injectTypes;
            }
            // resolve param types from static 'inject' method (old school method)
            if (typeof key.inject === 'function') {
                //we have auto dependencies
                return key.inject();
            }

        }
        return null;
    }

    private invokeCallback(action:(fn:ResolveCallbacks)=>void){
        try{
            action(this.callbacks);
            if(this.Parent){
                action(this.Parent.callbacks);
            }
        }
        catch{}
    }
    
    ResolveT<T>(key:Constructor<T>):T{
        return this.Resolve<T>(key);
    }

    public Resolve<T>(key: any): T {
        this.invokeCallback(cb=>cb.Resolve && cb.Resolve(key,this.BuildStack));

        this.EnsureInitialized();

        this.CheckResolveLoop(key);

        this.BuildStack.push(key);
        try {
            var value: any;
            //no overrides
            value = this.GetExistingResolution(key);
            if(!value){
                if(!value){
                    value = this.ResolveInjector(key);
                }
                if (!value) {
                    value = this.ResolveFromExplicitRegistration(key);
                }
                if (!value) {
                    value = this.ResolveFromGlobal(key);
                }
                if (!value) {
                    value = this.ResolveFromDependentType(key);
                }
                if(value){
                    //created this object
                    initializeObject(value,this);
                }
            }
            
        }
        finally {
            this.BuildStack.pop();
        }
        //create proxy
        var bld = this.getProxy(key);
        if(bld){
            value=bld.proxy(value);
        }
        
        this.invokeCallback(cb=>cb.Resolved && cb.Resolved(key,value,this.BuildStack));
        
        return value;
    }

    private getProxy(key:any){
        var builder = this._proxyFactory.getBuilder(key);
        if(!builder && this.Parent){
            builder = this.Parent.getProxy(key);
        }
        return builder;
    }

    private _proxyFactory =new ProxyFactory();
    public Proxy(key:any):ProxyBuilder{
        const builderKey = this.getKey(key);    //resolve a non-string key to a string
        return this._proxyFactory.builder(key);
    }

    public ChildScope(): Injector {
        return new Injector(this,this._global);
    }
}