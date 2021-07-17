import {Root,Lazy,Injector, Inject, Transient}  from '../src/index';

import 'reflect-metadata'
class Service{
    
    
}

class SubService extends Service{
    get Name() {return "subservice";}
}

@Transient
class NamedService{

    public name:string;
}

class Client2{
    constructor(){

    }
    
    ClientName:string;
    
    @Lazy({init:(ctx:Client2,svc:NamedService)=>svc.name=ctx.ClientName})
    inlineInitService:NamedService;

    @Lazy({init:(ctx:Client2,svc:NamedService)=>ctx.InitSerivce(svc)})
    instanceInitService:NamedService;
    @Lazy((clt,svc)=>clt.InitSerivce(svc))
    service3:NamedService;

    private InitSerivce(svc:NamedService){
        svc.name=this.ClientName;
    }
}

@Inject()
class Client{
    constructor(public svc1:Service){

    }
    @Lazy({key:Service})
    service:Service;
    @Lazy()
    service2:Service;
}

class Client3{
    @Lazy({key:SubService})
    service:Service;
}

describe('Lazy Initialization',()=>{
    var jsi:Injector;
    beforeEach(()=>{
        jsi=Root.ChildScope();
    });
    it('injects a lazy property as soon as it is called',()=>{
        var client = jsi.Resolve<Client>(Client);
        expect(client.service).toBeDefined();
    });

    it('requiring an object twice does not cause properties to be redefined',()=>{
        var client = jsi.Resolve<Client>(Client);
        var client = jsi.Resolve<Client>(Client);
    });

    it('can perform constructor injection and lazy injection on the same object',()=>{
        var client = jsi.Resolve<Client>(Client);
        expect(client.service).toBeDefined();
        expect(client.svc1).toBeDefined();
        expect(client.service).toBe(client.svc1);
    });

    it('resolves lazy injection using the current injector',()=>{
        var jsi2=jsi.ChildScope();
        var client = jsi.Resolve<Client>(Client);
        var client2=jsi2.Resolve<Client>(Client);
        expect(client).not.toBe(client2);   //created objects are different
        expect(client.service).not.toBe(client2.service);   //dependent objects are different
    });

    it('Will infer type from property if not set explicitly',()=>{
        var client = jsi.Resolve<Client>(Client);
        expect(client.service2).toBeInstanceOf(Service);
    });

    it('calls initialization function if provided',()=>{
        var clt = jsi.Resolve<Client2>(Client2);
        clt.ClientName='Initialized Value';
        expect(clt.inlineInitService).toBeDefined();
        expect(clt.inlineInitService.name).toBe('Initialized Value');
        expect(clt.instanceInitService.name).toBe('Initialized Value');
    });

    it('initializes a lazy value with a inline function (as opposed to options object)',()=>{

        var clt = jsi.Resolve<Client2>(Client2);
        expect(clt.service3).toBeDefined();
        expect(clt.service3).toBeDefined();
    });

    it('allows dependency key to be specified',()=>{

        var clt = jsi.Resolve<Client3>(Client3);
        expect(clt.service).toBeInstanceOf(SubService); 
    })

});