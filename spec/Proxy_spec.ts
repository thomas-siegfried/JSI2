import {
  ProxyFactory,
  PropertyGetter,
  ProxyBuilder,
  WILDCARD,
} from "../src/Proxy";
import { Person, SimplePerson, Service } from "./SampleTypes";
import { SingletonLifetimeManager } from "../src";
describe("ProxyFactory", () => {
  it("It creates a proxybuilder if not exist for the given key", () => {
    var pf = new ProxyFactory();
    var builder = pf.builder(Person);
    expect(builder).toBeDefined();
  });
  it("returns the same proxy factory for a given key once created", () => {
    var pf = new ProxyFactory();
    var builder = pf.builder(Person);
    var builder2 = pf.builder(Person);
    expect(builder).toBe(builder2);
  });

  it("uses a wildcard to match any type", () => {
    var fac = new ProxyFactory();
    var bld = fac.builder(WILDCARD); //wildcard proxy, will proxy any type
    bld.get("serviceName").instead(() => "fake service"); //getter for serviceName will use this as getter

    var serviceBuilder = fac.getBuilder(Service); //create a builder for specific type
    let svc = new Service();
    svc = serviceBuilder.proxy(svc); //proxy the type
    expect(svc.serviceName).toBe("fake service"); //method is proxied by the wildcard builder
  });

  it("prefers explicit proxies to wildcards", () => {
    var fac = new ProxyFactory();
    fac
      .builder(WILDCARD)
      .get(WILDCARD)
      .instead(() => null); //wildcard factory returns null from any getter
    fac
      .builder(SimplePerson)
      .get("lastname")
      .instead(() => null); //specific factory only proxies one getter

    var sp = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
    var bld = fac.getBuilder(SimplePerson);
    sp = bld.proxy(sp);
    expect(sp.firstname).toBe("Thomas"); //firstname is still live, not proxied
    expect(sp.lastname).toBeNull();
  });
});

describe("Proxy Builder", () => {
  it("provides pass through proxy if not configured", () => {
    var fac = new ProxyFactory();
    var bld = fac.builder(Person);
    var p = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
    var p2 = bld.proxy(p);
    expect(p.firstname).toEqual(p2.firstname);
    expect(p.lastname).toEqual(p2.lastname);
  });
  it("maintains unique property getters", () => {
    var fac = new ProxyFactory();
    var bld = fac.builder(Person);
    let g1 = bld.get("firstname");
    let g2 = bld.get("firstname");
    expect(g1).toBe(g2);
  });

  it("maintains unique property setters", () => {
    var fac = new ProxyFactory();
    var bld = fac.builder(Person);
    let g1 = bld.set("firstname");
    let g2 = bld.set("firstname");
    expect(g1).toBe(g2);
  });

  it('returns value from configured "instead" getter', () => {
    var fac = new ProxyFactory();
    var b = fac.builder(SimplePerson);
    b.get("firstname").instead((target, prop) => "??");
    var sp = new SimplePerson({ firstname: "Thomas" });
    var p = b.proxy(sp);
    expect(sp.firstname).toBe("Thomas");
    expect(p.firstname).toBe("??");
  });
  it("invokes before during get", () => {
    var b = new ProxyBuilder();
    var spy = jasmine.createSpy();
    b.get("firstname").before(spy);

    var spp = b.proxy(new SimplePerson());

    let fn = spp.firstname;
    expect(spy).toHaveBeenCalled();
  });

  it("invokes after during get", () => {
    var b = new ProxyBuilder();
    var spy = jasmine.createSpy();
    b.get("firstname").after(spy);

    var spp = b.proxy(new SimplePerson());

    let fn = spp.firstname;
    expect(spy).toHaveBeenCalled();
  });

  it("allows get:after to modify return values", () => {
    var b = new ProxyBuilder();
    var spy = jasmine.createSpy();
    b.get("firstname").after((obj, prop, val) => "Something Else");

    var spp = b.proxy(new SimplePerson());

    let fn = spp.firstname;
    expect(fn).toBe("Something Else");
  });

  it("does not create a proxy if nothing is configured", () => {
    var builder = new ProxyBuilder();
    var person = new SimplePerson();
    var prxy = builder.proxy(person);
    expect(prxy).toBe(person);
  });

  describe("Wildcards", () => {
    it("allows property getter wildcards", () => {
      var b = new ProxyBuilder();
      b.get("firstname");
      b.get("*").instead((obj, prop) => "test");
      var sp = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
      sp = b.proxy(sp);
      expect(sp.firstname).toBe("Thomas");
      expect(sp.lastname).toBe("test");
    });

    it("honors function proxies even with wildcard property proxies", () => {
      var b = new ProxyBuilder();
      b.get("*").instead((obj, prop) => "test");
      var sp = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
      sp = b.proxy(sp);
      expect(sp.Announce()).toBe("Thomas Siegfried");
    });

    it("allows wildcard setters for properties", () => {
      var b = new ProxyBuilder();
      b.set("firstname");
      b.set("*").instead((obj, prop, val) => (obj[prop] = "New Value"));
      var sp = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
      sp = b.proxy(sp);
      sp.lastname = "LastName";
      sp.firstname = "FirstName";
      expect(sp.firstname).toBe("FirstName");
      expect(sp.lastname).toBe("New Value");
    });

    it("allows wildcard function matches", () => {
      var b = new ProxyBuilder();
      b.fn("*").instead((obj, name, args) => name); //make all functions just return their own name

      var sp = new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" });
      sp = b.proxy(sp);
      expect(sp.Announce()).toBe("Announce");
    });
  });

  describe("setters", () => {
    it("invokes before", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.set("firstname").before(spy);
      var pxy = b.proxy(new SimplePerson());
      pxy.firstname = "Glifford";
      expect(spy).toHaveBeenCalled();
    });

    it("invokes after", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.set("firstname").after(spy);
      var pxy = b.proxy(new SimplePerson());
      pxy.firstname = "Glifford";
      expect(spy).toHaveBeenCalled();
    });

    it("allows before to change the new value", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.set("firstname").before((obj, prop, val) => "some other value");
      var pxy = b.proxy(new SimplePerson());
      pxy.firstname = "Glifford";
      expect(pxy.firstname).toBe("some other value");
    });

    it("invokes instead if provided", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.set("firstname").instead(spy);
      var p = new SimplePerson({ firstname: "first" });
      var pxy = b.proxy(p);
      pxy.firstname = "last";
      expect(spy).toHaveBeenCalled();
      expect(p.firstname).toBe("first");
    });
  });

  describe("fns", () => {
    it("returns fn unmodified if not configured", () => {
      var b = new ProxyBuilder();
      var spp = b.proxy(
        new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" })
      );
      var s = spp.Announce();
      expect(s).toBe("Thomas Siegfried");
    });

    it("calls before methods", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.fn("Announce").before(spy);
      var spp = b.proxy(
        new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" })
      );
      var s = spp.Announce();
      expect(spy).toHaveBeenCalled();
    });
    it("calls after methods", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy();
      b.fn("Announce").after(spy);
      var spp = b.proxy(
        new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" })
      );
      var s = spp.Announce();
      expect(spy).toHaveBeenCalled();
    });

    it("calls instead methods", () => {
      var b = new ProxyBuilder();
      var spy = jasmine.createSpy().and.returnValue("Flowers");
      b.fn("Announce").instead(spy);
      var spp = b.proxy(
        new SimplePerson({ firstname: "Thomas", lastname: "Siegfried" })
      );
      var s = spp.Announce();
      expect(spy).toHaveBeenCalled();
      expect(s).toBe("Flowers");
    });
  });
});
