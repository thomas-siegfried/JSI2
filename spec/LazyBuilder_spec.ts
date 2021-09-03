import { Injector, Inject } from "../src";
import { Lazy } from "../src/Lazy";

@Inject()
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
@Inject()
class ServiceB {
  constructor(public C: ServiceC) {}
}
@Inject()
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
    var a = jsi.ResolveT(ServiceA);
    expect(a.B.C.A).toBeDefined();
    expect(a.name).toBe("test");
  });
});
