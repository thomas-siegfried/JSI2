import { Bootstrap, Root, Injector } from "../src";

describe("bootstrap behavior", () => {
  class MyClass {
    constructor() {
      MyClass.spy();
    }
    public static spy = jasmine.createSpy();
  }
  @Bootstrap
  class Auto {
    constructor() {
      Auto.spy();
    }
    public static spy = jasmine.createSpy();
  }

  var inj: Injector;
  beforeEach(() => {
    inj = Root.ChildScope();
  });

  it("calls the spy if we resolve", () => {
    var cls = inj.Resolve(Auto);
    expect(Auto.spy).toHaveBeenCalled();
  });
  it("Executes autoInit when we resolve", () => {
    var spy = jasmine.createSpy();
    inj.RegisterAutoInit({ Key: "test", Factory: spy });
    inj.Resolve(MyClass);
    expect(spy).toHaveBeenCalled();
  });
  it("executes bootstrap when we resolve from root", () => {
    var cls = inj.Resolve(MyClass);
    expect(Auto.spy).toHaveBeenCalled();
  });
  it("executes bootstrap when we resolve from a child", () => {
    var cls = inj.ChildScope().Resolve(MyClass);
    expect(Auto.spy).toHaveBeenCalled();
  });
  it("executes bootstrap when we resolve from root explicitly (not off of global)", () => {
    var cls = inj.Resolve(MyClass);
    expect(Auto.spy).toHaveBeenCalled();
  });

  it("does execute bootstrap when we resolve from an independent if we manually register", () => {
    var inj = new Injector();
    inj.RegisterAutoInit({ Factory: Auto });
    var cls = inj.Resolve(MyClass);
    expect(Auto.spy).toHaveBeenCalled();
  });
});
