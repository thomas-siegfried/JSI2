import * as JSI from "../src/index";
import { Injector, InjectParam, Inject } from "../src/index";
describe("Inject decorator", () => {
  var jsi: Injector;
  beforeEach(() => {
    jsi = new Injector();
  });
  it("InjectParam() provides default values for non-overridden parameters", () => {
    class SubA {}
    class SubB {}
    class SubC extends SubB {}
    class Test {
      constructor(public a: SubA, @InjectParam(SubC) public b: SubB) {}
    }
    let j = jsi.ChildScope();
    let c = j.ResolveT(Test);
    expect(c.a).toBeInstanceOf(SubA);
    expect(c.b).toBeInstanceOf(SubC);
  });

  it("empty Inject() does not override param injection", () => {
    class SubA {}
    class SubB {}
    class SubC extends SubB {}
    @Inject()
    class Test {
      constructor(public a: SubA, @InjectParam(SubC) public b: SubB) {}
    }
    let j = jsi.ChildScope();
    let c = j.ResolveT(Test);
    expect(c.a).toBeInstanceOf(SubA);
    expect(c.b).toBeInstanceOf(SubC);
  });

  it("allows types to be set via Inject()", () => {
    class SubA {}
    class SubB {}
    class SubC extends SubB {}
    @Inject(SubA, SubC)
    class Test {
      constructor(public a: SubA, public b: SubB) {}
    }
    let j = jsi.ChildScope();
    let c = j.ResolveT(Test);
    expect(c.a).toBeInstanceOf(SubA);
    expect(c.b).toBeInstanceOf(SubC);
  });

  it("overrides any InjectParam values with values provided by Inject()", () => {
    class SubA {}
    class SubB {}
    class SubC extends SubB {}
    class SubD extends SubB {}
    @Inject(SubA, SubC)
    class Test {
      constructor(public a: SubA, @InjectParam(SubD) public b: SubB) {}
    }
    let j = jsi.ChildScope();
    let c = j.ResolveT(Test);
    expect(c.a).toBeInstanceOf(SubA);
    expect(c.b).toBeInstanceOf(SubC);
  });
});
