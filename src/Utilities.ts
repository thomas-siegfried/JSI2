import { ILifetimeManager } from "./Lifetime";
import { FactoryMethod, IInjector } from "./Interface";
//provides a way to hook into the Resolve pipeline in order for diagnostic purposes
export class ResolveCallbacks {
  Resolve: (key: any, buildStack: Array<any>) => void;
  Resolved: (key: any, value: any, buildStack: Array<any>) => void;
}

export class Util {
  static Extend(target: any, source: any) {
    //Object.assign(target,source);
    for (var prop in source) {
      target[prop] = source[prop];
    }
  }
  static isConstructor(obj: any) {
    return !!obj.prototype && !!obj.prototype.constructor.name;
  }
}

export class Registration {
  constructor(options: RegisterOptions) {
    Util.Extend(this, options);
  }
  Key: any;
  Factory: FactoryMethod;
  Instance: any;
  Dependencies: any[];
  LifetimeManager: ILifetimeManager;
  AutoInitialize: boolean = false;
}

export interface RegisterOptions {
  Key?: any;
  Factory?: any;
  Instance?: any;
  Dependencies?: any[];
  LifetimeManager?: ILifetimeManager;
  AutoInitialize?: boolean;
}

export interface IRegistrationCallback {
  (): void;
}

export class Resolution {
  private factory: FactoryMethod;
  constructor(factory: FactoryMethod) {
    this.factory = factory;
  }
  GetInstance(injector: IInjector): any {
    return this.factory(injector);
  }
}
