import { Injector, PerContext, Transient } from "../src/index.js";
//singleton, default
class ClassA {}
@Transient
class ClassB {}
@PerContext
class ClassC {}

describe("Dependency Lifetime", () => {
  var jsi: Injector;
  beforeEach(() => {
    jsi = new Injector();
  });
  describe("PerContextLifetimeManager", () => {
    it("PerContext is singleton within a single injector", () => {
      var c1 = jsi.Resolve(ClassC);
      var c2 = jsi.Resolve(ClassC);
      expect(c1).toBe(c2);
    });

    it("returns different instance in a child scope from parent scope", () => {
      var jsi2 = jsi.ChildScope();
      var c1 = jsi.Resolve(ClassC);
      var c2 = jsi2.Resolve(ClassC);
      expect(c1).not.toBe(c2);
    });

    it("returns different instance in a child context scope", () => {
      var jsi2 = jsi.CreateScopedContext();
      var c1 = jsi.Resolve(ClassC);
      var c2 = jsi2.Resolve(ClassC);
      expect(c1).not.toBe(c2);
    });

    it("returns same instance withing the same child scoped context", () => {
      var jsi2 = jsi.CreateScopedContext();
      var c1 = jsi2.Resolve(ClassC);
      var c2 = jsi2.Resolve(ClassC);
      expect(c1).toBe(c2);
    });

    it("returns different instances in two diffrent child context scopes", () => {
      var jsi2 = jsi.CreateScopedContext();
      var jsi3 = jsi.CreateScopedContext();
      var c1 = jsi2.Resolve(ClassC);
      var c2 = jsi3.Resolve(ClassC);
      expect(c1).not.toBe(c2);
    });
  });

  describe("ChildContextScope", () => {
    it("returns the same instance as parent for singleton objects", () => {
      var child = jsi.CreateScopedContext();
      var a1 = child.Resolve(ClassA);
      var a2 = jsi.Resolve(ClassA);
      expect(a1).toBe(a2);
    });
  });
});
