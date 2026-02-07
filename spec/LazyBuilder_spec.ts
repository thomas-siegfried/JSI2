import { Injector, Inject } from "../src/index.js";
import { Lazy } from "../src/Lazy.js";

@Inject(Lazy)
class ServiceC {
  constructor(lazy: Lazy) {
    lazy.For(this).Prop(
      (x) => x.A,
      ServiceA,
      (a) => (a.name = this.name)
    );
  }
  name: string = "test";
  public readonly A: ServiceA;
}
@Inject(ServiceC)
class ServiceB {
  constructor(public C: ServiceC) {}
}
@Inject(ServiceB)
class ServiceA {
  constructor(public B: ServiceB) {}
  name: string = "";
}

describe("LazyBuilder", () => {
  var jsi: Injector;
  beforeEach(() => {
    jsi = new Injector();
  });
  it("will fail if we require a circular dependency", () => {
    var a = jsi.Resolve(ServiceA);
    expect(a.B.C.A).toBeDefined();
    expect(a.name).toBe("test");
    expect(a).toBe(a.B.C.A);
  });
});
