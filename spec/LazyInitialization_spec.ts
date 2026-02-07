import { Root, Injector, Inject, Transient, Lazy } from "../src/index.js";

class Service {}

class SubService extends Service {
  get Name() {
    return "subservice";
  }
}

@Transient
class NamedService {
  public name: string;
}
@Inject(Lazy)
class Client2 {
  constructor(lazy: Lazy) {
    lazy
      .For(this)
      .Prop(
        (x) => x.inlineInitService,
        NamedService,
        (svc) => (svc.name = this.ClientName)
      )
      .Prop(
        (x) => x.instanceInitService,
        NamedService,
        (svc) => this.InitSerivce(svc)
      )
      .Prop(
        (x) => x.service3,
        NamedService,
        (svc) => this.InitSerivce(svc)
      );
  }

  ClientName: string;

  inlineInitService: NamedService;
  instanceInitService: NamedService;
  service3: NamedService;

  private InitSerivce(svc: NamedService) {
    svc.name = this.ClientName;
  }
}

@Inject(Service, Lazy)
class Client {
  constructor(public svc1: Service, bld: Lazy) {
    bld
      .For(this)
      .Prop((x) => x.service, Service)
      .Prop((x) => x.service2, Service);
  }
  service: Service;
  service2: Service;
}
@Inject(Lazy)
class Client3 {
  constructor(bld: Lazy) {
    bld.For(this).Prop((x) => x.service, SubService);
  }
  service: Service;
}

describe("Lazy Initialization", () => {
  var jsi: Injector;
  beforeEach(() => {
    jsi = Root.ChildScope();
  });
  it("injects a lazy property as soon as it is called", () => {
    var client = jsi.Resolve(Client);
    expect(client.service).toBeDefined();
  });

  it("requiring an object twice does not cause properties to be redefined", () => {
    var client = jsi.Resolve(Client);
    var client = jsi.Resolve(Client);
  });

  it("can perform constructor injection and lazy injection on the same object", () => {
    var client = jsi.Resolve<Client>(Client);
    expect(client.service).toBeDefined();
    expect(client.svc1).toBeDefined();
    expect(client.service).toBe(client.svc1);
  });

  it("resolves lazy injection using the current injector", () => {
    var jsi2 = jsi.ChildScope();
    var client = jsi.Resolve<Client>(Client);
    var client2 = jsi2.Resolve<Client>(Client);
    expect(client).not.toBe(client2); //created objects are different
    expect(client.service).not.toBe(client2.service); //dependent objects are different
  });

  it("Will infer type from property if not set explicitly", () => {
    var client = jsi.Resolve<Client>(Client);
    expect(client.service2).toBeInstanceOf(Service);
  });

  it("calls initialization function if provided", () => {
    var clt = jsi.Resolve<Client2>(Client2);
    clt.ClientName = "Initialized Value";
    expect(clt.inlineInitService).toBeDefined();
    expect(clt.inlineInitService.name).toBe("Initialized Value");
    expect(clt.instanceInitService.name).toBe("Initialized Value");
  });

  it("initializes a lazy value with a inline function (as opposed to options object)", () => {
    var clt = jsi.Resolve<Client2>(Client2);
    expect(clt.service3).toBeDefined();
    expect(clt.service3).toBeDefined();
  });

  it("allows dependency key to be specified", () => {
    var clt = jsi.Resolve<Client3>(Client3);
    expect(clt.service).toBeInstanceOf(SubService);
  });

  it("initializes each instance of a non-singleton", () => {
    //test for initialization occuring even on new objects created by a resolution
    jsi.RegisterTransient(Client2);
    var c1 = jsi.Resolve(Client2);
    c1.ClientName = "test1";
    expect(c1.service3).not.toBeNull();
    var c2 = jsi.Resolve(Client2);
    c2.ClientName = "test1";
    expect(c2.service3).toBeDefined();
    expect(c1).not.toBe(c2);
  });

  it("ties lazy properties to the injector object was created from", () => {
    var c1 = jsi.Resolve(Client2);

    var inj = new Injector();
    var c2 = inj.Resolve(Client2);
    expect(c1).not.toBe(c2);
    expect(c1.service3).not.toBe(c2.service3);
  });
});
