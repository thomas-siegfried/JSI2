import {
  ResolveCallbacks,
  Registration,
  IRegistrationCallback,
  Resolution,
  Util,
  RegisterOptions,
} from "./Utilities";
import { lifetimeSymbol, InjectSymbol, ProxySymbol } from "./Symbols";
import { ProxyFactory, ProxyBuilder } from "./Proxy";
import { Constructor, IInjector } from "./Interface";
import {
  ILifetimeManager,
  SingletonLifetimeManager,
  PerRequestLifetimeManager,
  PerContextLifetimeManager,
} from "./Lifetime";

export class Injector implements IInjector {
  constructor(
    public Parent: Injector = null,
    public _global: any = null,
    private isScopedContext: boolean = false
  ) {
    this.callbacks = new ResolveCallbacks();
  }
  private initialized: boolean;
  callbacks: ResolveCallbacks;
  private Registrations: Map<any, Registration> = new Map();
  private Resolutions: Map<any, any> = new Map();
  private BuildStack: any[] = new Array<any>(); //stack a items being resolved
  private AutoInitRegistrations: any[] = new Array<any>(); //registrations that need to be resolved at startup
  //callbacks used to register types  These get called on first require, because definie init is processed
  private RegistrationCallbacks: IRegistrationCallback[] =
    new Array<IRegistrationCallback>();

  //pulls resolution off of our resolutions, or some other scope object
  private getResolution(key: any): Resolution {
    if (this.isScopedContext) {
      return this.Parent.getResolution(key);
    }
    var scope = this.Resolutions;
    if (scope.has(key)) {
      return scope.get(key);
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

      var factory = this.CreateFromFactoryMethod.bind(
        this,
        registration.Factory,
        dependencyValues
      );

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
      if (factory.prototype) value = Object.create(factory.prototype);
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
      if (this.Parent) {
        this.Parent.EnsureInitialized();
      }
    }
  }

  private CheckResolveLoop(key: any): void {
    if (this.BuildStack.indexOf(key) > -1) {
      //unsure of the formatting here, just want to have consise logs, if we are resolving types, just write the type name
      var current = key.name ? "TYPE: " + key.name : key;
      var prev = this.BuildStack.pop();
      prev = prev.name ? "TYPE: " + prev.name : prev;
      throw new Error(
        "require loop detected building " + current + " for " + prev
      );
    }
  }

  //setup a registration
  public RegisterOptions(options: RegisterOptions): Registration {
    if (this.isScopedContext) {
      //scoped context uses parent registrations
      return this.Parent.RegisterOptions(options);
    }
    if (!options.Key) {
      throw new Error("Registration must have a key");
    }
    //if the key is a constructor, and we dont have a factory, assume the key is the factory.
    if (!options.Factory && typeof options.Key === "function") {
      options.Factory = options.Key;
    }
    //replace the key with the derived key
    var reg = new Registration(options);
    if (this.Registrations.has(reg.Key)) {
      throw new Error("key already defined");
    }
    this.Registrations.set(reg.Key, reg);
    if (options.AutoInitialize) {
      this.AutoInitRegistrations.push(options.Key);
    }
    return reg;
  }

  //old fashion register
  public Register(
    key: any,
    dependencies: any[] = null,
    factory: any = null
  ): Registration {
    return this.RegisterOptions({
      Key: key,
      Dependencies: dependencies,
      Factory: factory,
    });
  }

  //register a singleton
  public RegisterInstance(key: any, value: any): Registration {
    return this.RegisterOptions({ Key: key, Instance: value });
  }

  public RegisterTransient(
    key: any,
    factory: any = null,
    dependencies: any[] = null
  ): Registration {
    return this.RegisterOptions({
      Key: key,
      Factory: factory,
      LifetimeManager: new PerRequestLifetimeManager(),
      Dependencies: dependencies,
    });
  }

  public RegisterPerContext(
    key: any,
    factory: any = null,
    dependencies: any[] = null
  ): Registration {
    return this.RegisterOptions({
      Key: key,
      Factory: factory,
      LifetimeManager: new PerContextLifetimeManager(),
      Dependencies: dependencies,
    });
  }

  public RegisterCallback(callback: IRegistrationCallback) {
    if (this.initialized) {
      throw new Error(
        "Registration Callback added when injector is already initialized"
      );
    }
    this.RegistrationCallbacks.push(callback);
  }

  //register an init callback
  public RegisterAutoInit(options: RegisterOptions): void {
    //setup key value, can be null
    if (!options.Key) {
      options.Key = {};
    }
    options.AutoInitialize = true;
    this.RegisterOptions(options);
  }

  private ResolveFromExplicitRegistration(key: any): Resolution {
    var reg = this.GetRegistration(key);
    if (reg) {
      var res = this.CreateFromRegistration(reg);
      return res;
    }
    return null;
  }
  private ResolveFromGlobal(key: any): Resolution {
    if (!this._global) {
      return null;
    }
    var value = this._global[key];
    if (value != undefined) return new Resolution(() => value);
    return null;
  }
  //attempt to auto register a type if the key is a type
  private ResolveFromDependentType(key: any): Resolution {
    var value: Resolution;
    if (typeof key === "function") {
      //create a new registration
      var dep = this.GetDependenciesFromType(key);
      let lifeMgr: ILifetimeManager = null; //get the lifetime manager from the type
      if (typeof key[lifetimeSymbol] == "function") {
        lifeMgr = key[lifetimeSymbol]();
      }
      //TODO: Register this on parent if we are a ContextInjector
      this.RegisterOptions({
        Key: key,
        Factory: key,
        Dependencies: dep,
        LifetimeManager: lifeMgr,
      });
      value = this.ResolveFromExplicitRegistration(key);
    }
    return value;
  }

  private ResolveInjector(key: any): Resolution {
    if (key == Injector) {
      return new Resolution(() => this);
    }
    return null;
  }

  private GetDependenciesFromType(key: any) {
    if (typeof key === "function") {
      //resolve inject params from symbol
      var injectTypes = key[InjectSymbol];
      if (injectTypes) {
        return injectTypes;
      }
      // resolve param types from static 'inject' method (old school method)
      if (typeof key.inject === "function") {
        //we have auto dependencies
        return key.inject();
      }
    }
    return null;
  }

  private invokeCallback(action: (fn: ResolveCallbacks) => void) {
    try {
      action(this.callbacks);
      if (this.Parent) {
        action(this.Parent.callbacks);
      }
    } catch {}
  }

  // ResolveT<T>(key: Constructor<T>): T {
  //   return this.Resolve<T>(key);
  // }

  SaveResolution(key: any, res: Resolution) {
    if (this.isScopedContext) this.Parent.SaveResolution(key, res);
    else this.Resolutions.set(key, res);
  }

  PrepObject(value: any, key: any): any {
    var bld: ProxyBuilder = this.getProxy(key);
    if (bld) {
      value = bld.proxy(value);
    }
    return value;
  }
  Resolve<T>(key: Constructor<T>): T;
  Resolve<T>(key: any): T;
  public Resolve<T>(key: any | Constructor<T>): T {
    this.invokeCallback((cb) => cb.Resolve && cb.Resolve(key, this.BuildStack));
    this.EnsureInitialized();

    this.CheckResolveLoop(key);

    this.BuildStack.push(key);

    var value: any;
    try {
      var res: Resolution = this.getResolution(key);
      if (!res) {
        var resolvers = [
          this.ResolveInjector,
          this.ResolveFromExplicitRegistration,
          this.ResolveFromGlobal,
          this.ResolveFromDependentType,
        ];
        resolvers.forEach((r) => {
          if (!res) res = r.call(this, key);
        });
        if (res) {
          //record resolution
          this.SaveResolution(key, res);
        }
      }
      if (res) {
        value = res.GetInstance(this);
        if (value) value = this.PrepObject(value, key);
      }
    } finally {
      this.BuildStack.pop();
    }

    this.invokeCallback(
      (cb) => cb.Resolved && cb.Resolved(key, value, this.BuildStack)
    );

    return value;
  }

  public IsProxy(value: any) {
    return !!value[ProxySymbol];
  }

  private getProxy(key: any): ProxyBuilder {
    var builder = this._proxyFactory.getBuilder(key);
    if (!builder && this.Parent) {
      builder = this.Parent.getProxy(key);
    }
    return builder;
  }

  private _proxyFactory = new ProxyFactory();
  public Proxy(key: any): ProxyBuilder {
    return this._proxyFactory.builder(key);
  }

  public ChildScope(): Injector {
    return new Injector(this, this._global);
  }

  public CreateScopedContext(): Injector {
    return new Injector(this, this._global, true);
  }
}
