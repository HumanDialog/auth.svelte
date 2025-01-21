import { Token } from "./Token"
import { gv } from "./Storage";
import { Configuration, Mode, Local_user } from "./Configuration";
import {Writable, writable} from 'svelte/store'

export class User
{
    public  given_name      :string = "";
    public family_name      :string = "";
    public picture          :string = "";
    public email            :string = "";
    public email_verified   :boolean = false;
}

export class Header_info
{
    public  key:    string
    public  value:  string
}

export class Tenant_info
{
    public  id:         string
    public  url:        string
    public  name:       string = ""
    public  headers:    Header_info[] | undefined
}

export class App_instance_info
{
    public tenant_id:       string = ""
    public name:            string = ""
    public desc:            string = ""
    public img:             string = ""
    public is_public:       boolean = false;
    public unauthorized_guest_allowed: boolean = false;

}

export class Session
{
    private     my_validation_ticket    :number = 0;
    private     _is_active              :boolean = false;
    private     _user                   :User;
    private     _id_token               :Token;
    private     _access_token           :Token;
    private     _refresh_token          :Token;

    public      appInstanceInfo         :App_instance_info|null = null;

    public      configuration           :Configuration;
    
    constructor()
    {
        
    }

    public configure(cfg, internal=false)
    {
        this.configuration = new Configuration;

        if(cfg)
        {
            switch(cfg.mode)
            {
            case 'remote':
                this.configuration.mode             = Mode.Remote;
                this.configuration.iss              = cfg.remote.iss;
                this.configuration.client_id        = cfg.remote.client_id ?? cfg.remote.clientID;
                this.configuration.client_secret    = cfg.remote.client_secret ?? cfg.remote.clientSecret;
                this.configuration.scope            = cfg.remote.scope;
                this.configuration.api_version      = cfg.remote.api_version ?? cfg.remote.apiVersion ?? "v001";
                this.configuration.tenant           = cfg.remote.tenant ?? "";
                this.configuration.groups_only      = cfg.remote.groupsOnly ?? cfg.remote.groups_only ?? false;
                this.configuration.ask_organization_name = cfg.remote.ask_organization_name ?? cfg.remote.askOrganizationName ?? true
                this.configuration.refresh_token_persistent  = cfg.remote.refresh_token_persistent ?? cfg.remote.refreshTokenPersistent ?? true;
                this.configuration.terms_and_conditions_href = cfg.remote.terms_and_conditions_href ?? cfg.remote.termsAndConditionsHRef;    
                this.configuration.privacy_policy_href       = cfg.remote.privacy_policy_href ?? cfg.remote.privacyPolicyHRef;
                this.configuration.let_choose_group_first    = cfg.remote.let_choose_group_first ?? cfg.remote.letChooseGroupFirst ?? false; 
                break;

            case 'local':
                this.configuration.mode         = Mode.Local;
                this.configuration.local_api    = cfg.local.api;
                this.configuration.api_version  = cfg.local.api_version ?? cfg.local.apiVersion ?? "v001";

                this.configuration.local_users = [];
                if(cfg.local.users && Array.isArray(cfg.local.users))
                {
                    cfg.local.users.forEach(u => {
                        switch(typeof u)
                        {
                        case 'string':
                            {
                                const user = new Local_user();
                                user.username = u;
                                this.configuration.local_users.push(user);
                            }
                            break;

                        case 'object':
                            {
                                const user = new Local_user();
                                user.username = u.username ?? "";
                                user.role = u.role ?? "";
                                user.groupId = u.groupId ?? 0;
                                user.uid = u.uid ?? 0;
                                this.configuration.local_users.push(user);
                            }
                            break;
                        }
                    });
                }
                break;

            case 'disabled':
                this.configuration.mode         = Mode.Disabled;
                this.configuration.local_api    = cfg.local.api;
                this.configuration.api_version  = cfg.local.api_version ?? cfg.local.apiVersion ?? "v001";
                break;
            }
        }
        else
        {
            this.configuration.mode = Mode.Disabled;
        }

        this.setup_mode(this.configuration.mode);

        if(!internal)
        {
            gv.set('_hd_auth_cfg', JSON.stringify(cfg))

            if(this.isValid)  
                this.boost_validation_ticket();
            
            let new_session :Session = new Session();
            new_session.clone_from(this);
            session.set(new_session);       // forces store subscribers
        }
    }

    private clone_from(src :Session)
    {
        this.my_validation_ticket   = src.my_validation_ticket;
        this._is_active             = src._is_active;
        this._user                  = src._user;
        this._id_token              = src._id_token;
        this._access_token          = src._access_token;
        this._refresh_token         = src._refresh_token;
        this.configuration          = src.configuration;
    }
    
    public get isActive()  :boolean
    {
        if(!this.isValid)
            this.validate();

        return this._is_active;
    }

    public get user()  :User
    {
        if(!this.isValid)
            this.validate();

        return this._user;
    }

    public get idToken()  :Token
    {
        if(!this.isValid)
            this.validate();

        return this._id_token;
    }

    public get accessToken()  :Token
    {
        if(!this.isValid)
            this.validate();

        return this._access_token;
    }

    public get refreshToken()  :Token
    {
        if(!this.isValid)
            this.validate();

        return this._refresh_token;
    }

    public get isValid() :boolean
    {
        let ticket :number;
        if(!gv.get_num("_hd_auth_session_validation_ticket", (v) => {ticket = v;}))
            return false;

        return (ticket == this.my_validation_ticket);
    }

    public get apiAddress()    :string
    {
        let res :string;
        if(gv.get("_hd_auth_api_address", (v)=>{res=v;}))
            return res;
        else
            return "";
    }


    public get tid()    :string
    {
        let res :string;
        if(gv.get("_hd_auth_tenant", (v)=>{res=v;}))
            return res;
        else
            return "";
    }

    public get appId()  :string
    {
        let scopes = this.configuration.scope.split(' ')
        if(!scopes.length)
            return '';
        
        //remove predefined scopes
        scopes = scopes.filter( s => (s!='openid') && (s!='profile') && (s!='email') && (s!='address') && (s!='phone'));
        if(!scopes.length)
            return '';

        let app_id = scopes[0];
        return app_id;
    }

    public get tenants():   Tenant_info[]
    {
        let res: string;
        if(!gv.get("_hd_signedin_tenants", (v)=>{res=v;}))
            return [];
        if(!res)
            return [];

        const tenants : Tenant_info[] = JSON.parse(res);
        return tenants;
    }

    public set tenants(infos: Tenant_info[])
    {
        const tInfos = JSON.stringify(infos)
        gv.set("_hd_signedin_tenants", tInfos, false);
    }

    public get isUnauthorizedGuest() :boolean
    {
        let result: boolean = false;
        
        let res: string;
        if(!gv.get("_hd_auth_unauthorized_guest", (v)=>{res=v;}))
            result = false;
        else if(res == "1")
            result = true;
        else
            result = false;

        return result;
    }

    public set isUnauthorizedGuest(val :boolean) 
    {
        gv.set("_hd_auth_unauthorized_guest", val ? "1" : "", true);
    }

    protected validate() : void
    {
        if(!gv.get_num("_hd_auth_session_validation_ticket", (v) => {this.my_validation_ticket = v;}))
        {
            this.my_validation_ticket = 1;
            gv.set_num("_hd_auth_session_validation_ticket", this.my_validation_ticket);
        }

        if(!this.configuration)
        {
            let cfg_json;
            if(gv.get('_hd_auth_cfg', (v) => cfg_json = v))
            {
                try
                {
                    let cfg = JSON.parse(cfg_json);
                    this.configure(cfg, true);
                }
                catch(err)
                {
                    console.error(err);
                }
            }
        }

        if(this.disabled)
        {
            this.setCurrentTenantAPI(this.configuration.local_api, '')
            this._is_active = true;
            return;
        }
        else if(this.local)
        {
            if(this.localDevCurrentUser)
            {
                this._is_active = true;
            }
            else
            {
                this._is_active = false;
            }

            this.setCurrentTenantAPI(this.configuration.local_api, '')
            return;
        }

        this._is_active = false;

        let token :string;
        if(gv.get("_hd_auth_id_token", (v) => {token=v;}))
        {
            this._id_token = new Token(token);
            this._user = new User();
            this._user.given_name       = this._id_token.get_claim<string>("given_name");
            this._user.family_name      = this._id_token.get_claim<string>("family_name");
            this._user.picture          = this._id_token.get_claim<string>("picture");
            this._user.email            = this._id_token.get_claim<string>("email");
            this._user.email_verified   = this._id_token.get_claim<boolean>("email_verified");
        }
        else
            this._id_token = null;


        if(gv.get("_hd_auth_access_token", (v) => {token=v;}))
            this._access_token = new Token(token);
        else
            this._access_token = null;


        if(gv.get("_hd_auth_refresh_token", (v) => {token=v;}))
            this._refresh_token = new Token(token, false);
        else
            this._refresh_token = null;

        if((this._access_token != null) || (this._id_token != null))
            this._is_active = true;
    }

    public signin(tokens_info, chosen_tenant_id = undefined) :boolean
    {
        if((tokens_info.access_token == undefined) || (tokens_info.access_token == ""))
        {
            this.signout();
            return true;
        }

        if((tokens_info.id_token == undefined) || (tokens_info.id_token == ""))
        {
            this.signout();
            return true;
        }

        if((tokens_info.refresh_token == undefined) || (tokens_info.refresh_token == ""))
        {
            this.signout();
            return true;
        }

        gv.set("_hd_auth_access_token", tokens_info.access_token);
        gv.set("_hd_auth_id_token", tokens_info.id_token);
        gv.set("_hd_auth_refresh_token", tokens_info.refresh_token, this.configuration.refresh_token_persistent);

        if(tokens_info.tenant != undefined)
        {
            this.setCurrentTenantAPI(tokens_info.tenant.url, tokens_info.tenant.id);
            this.tenants = [tokens_info.tenant];
        }
        else if((tokens_info.tenants != undefined) && (tokens_info.tenants.length > 0))
        {
            if(tokens_info.tenants.length == 1)
                this.setCurrentTenantAPI(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
            else
            {
                if(chosen_tenant_id)
                {
                    const chosen_tenant = tokens_info.tenants.find( el => el.id == chosen_tenant_id)
                    if(chosen_tenant)
                        this.setCurrentTenantAPI(chosen_tenant.url, chosen_tenant.id);
                    else
                        this.setCurrentTenantAPI(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
                }
                else
                    this.setCurrentTenantAPI(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
            }

            this.tenants = tokens_info.tenants
        }
        else if((tokens_info.apps != undefined) && (tokens_info.apps.length > 0))
        {
            // todo: multi app not supported yet?
            this.signout();
            return false;
        }
        else
        {
            this.signout();
            return false;
        }

        this.boost_validation_ticket();
        this.validate();

        let new_session :Session = new Session();
        new_session.clone_from(this);
        session.set(new_session);       // forces store subscribers
        
        return true;
    }

    protected boost_validation_ticket() :void
    {
        let validation_ticket :number = 0;
        gv.get_num("_hd_auth_session_validation_ticket", (v) => {validation_ticket = v;});
        validation_ticket++;
        gv.set_num("_hd_auth_session_validation_ticket", validation_ticket);
        this.my_validation_ticket = validation_ticket;
    }

    public setCurrentTenantAPI(url :string, tid :string) :void
    {
        gv.set("_hd_auth_api_address", url);
        gv.set("_hd_auth_tenant", tid);
        gv.set('_hd_auth_last_chosen_tenant_id', tid, true);
    }

    public get lastChosenTenantId() :string
    {
        let res;
        if(!gv.get('_hd_auth_last_chosen_tenant_id', (v) => res=v))
            return '';
        
        return res;
    }

    public signout() : void
    {
        gv.set("_hd_auth_id_token", "");
        gv.set("_hd_auth_access_token", "");
        gv.set("_hd_auth_refresh_token", "", this.configuration.refresh_token_persistent);

        gv.set("_hd_auth_api_address", "");
        gv.set("_hd_auth_tenant", "");
       
        gv.set("_hd_auth_local_dev_user", "");
        gv.set('_hd_auth_unauthorized_guest', "", true)

        this._id_token = null;
        this._access_token = null;
        this._refresh_token = null;
        this._is_active = false;

        this.boost_validation_ticket();

        let new_session :Session = new Session();
        new_session.clone_from(this);
        session.set(new_session);       // forces store subscribers
    }

    public appAccessRole() : string
    {
        if(!this.configuration)
            return '';
        
        const scopes = this.configuration.scope.split(' ')
        if((!scopes) || scopes.length == 0)
            return '';

        const appId = scopes[scopes.length-1];

        if(!this.isActive)
            return '';

        const token: Token = this.accessToken;
        if(token == undefined)
            return '';

        if(token == null)
            return '';

        if(!token.raw)
            return '';

        if(!token.is_jwt)
            return '';

        const access: object[] = token.payload['access'];

        if( !!access && 
            access.length > 0)
        {
            const scopeIdx = access.findIndex(e => e['app'] == appId)
            if(scopeIdx < 0)
                return '';

            const accessScope: object =  access[scopeIdx];

            const scopeTenants = accessScope['tenants'];
            if(!scopeTenants || scopeTenants.length == 0)
                return '';

            for(let i=0; i<scopeTenants.length; i++)
            {
                const tenantInfo = scopeTenants[i];
                if(typeof tenantInfo === 'object' && tenantInfo !== null)
                {
                    if(tenantInfo['tid'] == this.tid)
                    {
                        if(!tenantInfo.details)
                            return '';

                        const accessDetails = JSON.parse(tenantInfo.details);
                        return accessDetails.role ?? '';
                    }
                }
            }
            return '';
        }
        else
            return '';
    }

    public authAccessGroup() : number
    {
        return this.accessGroup("auth");
    }

    public filesAccessGroup() : number
    {
        return this.accessGroup("files");
    }

    private accessGroup(scope: string) : number
    {
        if(!this.isActive)
            return 0;

        const token: Token = this.accessToken;
        if(token == undefined)
            return 0;

        if(token == null)
            return 0;

        if(!token.raw)
            return 0;

        if(!token.is_jwt)
            return 0;

        const access: object[] = token.payload['access'];

        if( !!access && 
            access.length > 0)
        {
            const scopeIdx = access.findIndex(e => e['app'] == scope)
            if(scopeIdx < 0)
                return 0;

            const accessScope: object =  access[scopeIdx];

            const scopeTenants = accessScope['tenants'];
            if(!scopeTenants || scopeTenants.length == 0)
                return 0;

            for(let i=0; i<scopeTenants.length; i++)
            {
                const tenantInfo = scopeTenants[i];
                if(typeof tenantInfo === 'object' && tenantInfo !== null)
                {
                    if(tenantInfo['tid'] == this.tid)
                        return tenantInfo['gid'] ?? 0;
                }
            }
            return 0;
        }
        else
            return 0;

    }

    public async __is_admin() :Promise<boolean>
    {
        if(!this.isValid)
            this.validate();

        if(!this.isActive)
            return false;

        if(this.tid == "")
            return false;

        let path :string;
        path = this.configuration.iss + "/auth/am_i_admin";
        path += "?tenant=" + this.tid;

        const  res = await fetch(  path,
                                {
                                    method: 'get',
                                    headers : new Headers({
                                        'Authorization':'Bearer ' + this._access_token.raw,
                                        'Accept': 'application/json'})
                                });
        if(!res.ok)
            return false;

        const result = await res.json();
        return result.response === true;
    }

    public get mode() :Mode
    {
        let num_mode :number = 0;
        if(!gv.get_num('_hd_auth_session_mode', (v) => { num_mode = v; }))
            return Mode.Remote;
        else switch(num_mode)
        {
        case 0:
            return Mode.Remote;

        case 1:
            return Mode.Local;

        case 2:
            return Mode.Disabled;

        default:
            return Mode.Remote;
        }
    }

    public set mode( m :Mode)
    {
        switch(m)
        {
        case Mode.Remote:
            gv.set_num("_hd_auth_session_mode", 0);
            break;

        case Mode.Local:
            gv.set_num("_hd_auth_session_mode", 1);
            break;

        case Mode.Disabled:
            gv.set_num("_hd_auth_session_mode", 2);
            break;
        }

    }

    public get remote() :boolean
    {
        return (this.mode == Mode.Remote);
    }

    public get local() :boolean
    {
        return (this.mode == Mode.Local);
    }

    public get disabled() :boolean
    {
        return (this.mode == Mode.Disabled);
    }

    protected setup_mode(m :Mode)
    {
        let was_remote :boolean = this.mode == Mode.Remote;
        
        //this.signout();
        this.mode = m;

       
        if(m==Mode.Remote)
        {
            /*let org_api_addr :string;
            if(gv.get("_hd_auth_org_api_address", (v)=>{org_api_addr=v;}))
            {
                gv.set("_hd_auth_api_address", org_api_addr);
                gv.set("_hd_auth_org_api_address", '');  
            }
            */
        }
        else
        {
            if(this.configuration && this.configuration.local_api)
            {   
                //gv.set("_hd_auth_org_api_address", '');  
                //gv.set("_hd_auth_api_address", this.configuration.local_api);  
                //this.setCurrentTenantAPI(this.configuration.local_api, '')
            }
        }
    }

    public setLocalDevCurrentUser(email :string)
    {
        gv.set('_hd_auth_local_dev_user', email);

        this.boost_validation_ticket();
        this.validate();

        let new_session :Session = new Session();
        new_session.clone_from(this);
        session.set(new_session);       // forces store subscribers
        
    }

    public get localDevCurrentUser() :Local_user
    {
        let email :string;
        gv.get('_hd_auth_local_dev_user', (v)=>{email=v;});

        if(!email)
            return null;

        const foundUser = this.configuration.local_users.find(u => u.username == email)
        return foundUser;
    }

}

export let session :Writable<Session> = writable(new Session);