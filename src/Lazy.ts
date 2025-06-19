import { Inject } from "./Decorators";
import { Injector } from "./Injector";

@Inject(Injector)
export class Lazy {
  constructor(private inj: Injector) {}
  For<T>(t: T) {
    return new LazyHelper<T>(this.inj, t);
  }
}

export class LazyHelper<T> {
  constructor(private inj: Injector, private host: T) {}

  Prop<K>(
    key: (t: T) => K,
    injKey: any,
    init?: (val: K) => void
  ): LazyHelper<T> {
    var propName = parseFunction(key);
    var prototype = Object.getPrototypeOf(this.host);

    var propType = injKey;
    var factoryMethod = () => {
      var value: K = this.inj.Resolve<K>(propType);
      if (init) {
        init(value);
      }
      return value;
    };
    //next setup a property descriptor with this get value
    let val: K,
      resolved: boolean = false;
    Object.defineProperty(this.host, propName, {
      get: () => {
        if (!resolved) {
          val = factoryMethod();
          resolved = true;
        }
        return val;
      },
    });
    return this;
  }
}

//brute force attempt to pull a member from a function simillar to Expression in C#
//expects functions in the form of d=>d.Xyz or (d)=>d.abc etc
function parseFunction(fn: (i: any) => any): string {
  let txt = fn.toString();
  let prm = txt.substring(0, txt.indexOf("=>")).replace(/[(|)]/g, "").trim();
  let rest = txt.substring(txt.indexOf("=>") + 2).trim();
  let member = rest.substring(prm.length + 1);
  return member;
}
