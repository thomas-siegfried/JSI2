//TODO: Wildcard mapping for properties and types, so that we can 'mask' types for unit testing
//Jasmine specific extensions (different library) for unit test helpers
import { ProxySymbol } from "./Symbols.js";
export const WILDCARD = "*";
export class ProxyFactory {
  _map: Map<any, ProxyBuilder> = new Map<any, ProxyBuilder>();

  builder(key: any): ProxyBuilder {
    if (!this._map.has(key)) {
      this._map.set(key, new ProxyBuilder());
    }
    return this._map.get(key);
  }

  getBuilder(key: any): ProxyBuilder {
    var bld = this._map.get(key);
    if (!bld) {
      bld = this._map.get(WILDCARD); //return the wildcard type map
    }
    return bld;
  }
}

export class ProxyBuilder {
  private _getters = new Map<string, PropertyGetter>();
  private _setters = new Map<string, PropertySetter>();
  private _fns = new Map<string, Fn>();
  private createHandler(): any {
    return {
      get: (obj: any, prop: string) => {
        var val;

        //raw value
        val = obj[prop];
        if (typeof val === "function") {
          var fn = this._fns.get(prop);
          if (!fn) {
            fn = this._fns.get(WILDCARD);
          }
          if (fn) {
            val = fn.proxyMethod(obj, prop, val);
          } else {
            return val.bind(obj);
          }
        } else {
          //value is not a function, look for getter wrappers
          var getter = this._getters.get(prop);
          if (!getter) getter = this._getters.get(WILDCARD); //check for wildcard getter proxy
          if (getter) val = getter.invokeHandler(obj, prop);
          else val = obj[prop];
        }

        //if the value we are 'getting' is a function, and we have a function config, apply that

        return val;
      },
      set: (obj: any, prop: string, val: any) => {
        var setter = this._setters.get(prop);
        if (!setter) setter = this._setters.get(WILDCARD); //check for wildcard getter proxy
        if (setter) setter.invokeHandler(obj, prop, val);
        else obj[prop] = val;
        return true; //setting occurred ok
      },
    };
  }

  private isFn(obj: any) {}

  //true if any proxy behavior is configured
  isConfigured() {
    return this._fns.size || this._getters.size || this._setters.size;
  }

  proxy<T extends Object>(obj: T) {
    if (!this.isConfigured()) {
      return obj; //if we have no configuration, just return the object unwrapped
    }
    const pxy = new Proxy(obj, this.createHandler()) as T;
    pxy[ProxySymbol] = true;
    return pxy;
  }

  get(prop: string): PropertyGetter {
    let gtr = this._getters.get(prop);
    if (!gtr) {
      gtr = new PropertyGetter();
      this._getters.set(prop, gtr);
    }
    return gtr;
  }
  set(prop: string): PropertySetter {
    let str = this._setters.get(prop);
    if (!str) {
      str = new PropertySetter();
      this._setters.set(prop, str);
    }
    return str;
  }
  fn(name: string): Fn {
    let fn = this._fns.get(name);
    if (!fn) {
      fn = new Fn();
      this._fns.set(name, fn);
    }
    return fn;
  }
}

interface PropInvoke {
  (target: any, prop: string): any;
}

interface PropValueInvoke {
  (taget: any, prop: string, value: any): any;
}

interface FnInvoke {
  (target: any, name: string, args: any[]): any;
}

interface FnAfterInvoke {
  (target: any, name: string, args: any[], result: any): any;
}

export class PropertyGetter {
  invokeHandler(target: any, prop: string): any {
    //call the befores
    let propValue = undefined;
    this._before.forEach((pi) => pi(target, prop));
    //call the instead, or call the default method
    if (this._instead) propValue = this._instead(target, prop);
    else propValue = target[prop];
    //call the afters, reset the propValue if the after returns anything
    this._after.forEach((pi) => {
      const aft = pi(target, prop, propValue);
      if (aft !== undefined) {
        propValue = aft;
      }
    });
    return propValue;
  }

  private _before = new Array<PropInvoke>();
  private _instead: PropInvoke;
  private _after = new Array<PropValueInvoke>();
  before(fn: PropInvoke) {
    this._before.push(fn);
  }
  after(fn: PropValueInvoke) {
    this._after.push(fn);
  }
  instead(fn: PropInvoke) {
    this._instead = fn;
  }
}

export class PropertySetter {
  invokeHandler(target: any, prop: string, value: any): void {
    //call the befores, replacing incoming value if returned
    this._before.forEach((pi) => {
      const tmp = pi(target, prop, value);
      if (tmp !== undefined) {
        value = tmp;
      }
    });
    //call the instead, or call the default method
    if (this._instead) this._instead(target, prop, value);
    else target[prop] = value;
    //call the afters
    this._after.forEach((pi) => {
      pi(target, prop, value);
    });
  }
  private _before = new Array<PropValueInvoke>();
  private _instead: PropValueInvoke;
  private _after = new Array<PropValueInvoke>();
  before(fn: PropValueInvoke) {
    this._before.push(fn);
  }
  after(fn: PropValueInvoke) {
    this._after.push(fn);
  }
  instead(fn: PropValueInvoke) {
    this._instead = fn;
  }
}

export class Fn {
  proxyMethod(obj: any, name: string, fn: () => any) {
    return new Proxy(fn, {
      apply: (target, obj, args) => {
        var result = undefined;
        this._before.forEach((f) => f(obj, name, args));
        if (this._instead) {
          result = this._instead(obj, name, args);
        } else {
          result = fn.apply(obj, args);
        }
        this._after.forEach((f) => f(obj, name, args, result));
        return result;
      },
    });
  }
  private _before = new Array<FnInvoke>();
  private _after = new Array<FnAfterInvoke>();
  private _instead: FnInvoke;
  before(fn: FnInvoke) {
    this._before.push(fn);
  }
  after(fn: FnAfterInvoke) {
    this._after.push(fn);
  }
  instead(fn: FnInvoke) {
    this._instead = fn;
  }
}
