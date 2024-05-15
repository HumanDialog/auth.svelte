import { Token } from "./Token"
import { gv } from "./Storage";
import { Configuration, Mode } from "./Configuration";
import {Writable, writable} from 'svelte/store'

export class User
{
    public  given_name      :string = "";
    public family_name      :string = "";
    public picture          :string = "";
    public email            :string = "";
    public email_verified   :boolean = false;
}


export class Session
{
    private     my_validation_ticket    :number = 0;
    private     _is_active              :boolean = false;
    private     _user                   :User;
    private     _id_token               :Token;
    private     _access_token           :Token;
    private     _refresh_token          :Token;

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
                this.configuration.refresh_token_persistent  = cfg.remote.refresh_token_persistent ?? cfg.remote.refreshTokenPersistent ?? true;
                this.configuration.terms_and_conditions_href = cfg.remote.terms_and_conditions_href ?? cfg.remote.termsAndConditionsHRef;    
                this.configuration.privacy_policy_href       = cfg.remote.privacy_policy_href ?? cfg.remote.privacyPolicyHRef;
                break;

            case 'local':
                this.configuration.mode         = Mode.Local;
                this.configuration.local_api    = cfg.local.api;
                this.configuration.local_users  = [...cfg.local.users];
                this.configuration.api_version  = cfg.local.api_version ?? cfg.local.apiVersion ?? "v001";
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
            console.log('session disabled');
            this.set_current_tenant_api(this.configuration.local_api, '')
            this._is_active = true;
            return;
        }
        else if(this.local)
        {
            if(this.localDevCurrentUser)
            {
                if(this.configuration.local_users.find( v => v==this.localDevCurrentUser))
                {
                    this._is_active = true;
                }
                else
                {
                    this._is_active = false;
                }
            }
            else
            {
                this._is_active = false;
            }

            this.set_current_tenant_api(this.configuration.local_api, '')
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
            this.set_current_tenant_api(tokens_info.tenant.url, tokens_info.tenant.id);
        else if((tokens_info.tenants != undefined) && (tokens_info.tenants.length > 0))
        {
            if(tokens_info.tenants.length == 1)
                this.set_current_tenant_api(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
            else
            {
                if(chosen_tenant_id)
                {
                    const chosen_tenant = tokens_info.tenants.find( el => el.id == chosen_tenant_id)
                    if(chosen_tenant)
                        this.set_current_tenant_api(chosen_tenant.url, chosen_tenant.id);
                    else
                        this.set_current_tenant_api(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
                }
                else
                    this.set_current_tenant_api(tokens_info.tenants[0].url, tokens_info.tenants[0].id);
            }
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

    protected set_current_tenant_api(url :string, tid :string) :void
    {
        gv.set("_hd_auth_api_address", url);
        gv.set("_hd_auth_tenant", tid);
    }

    public signout() : void
    {
        gv.set("_hd_auth_id_token", "");
        gv.set("_hd_auth_access_token", "");
        gv.set("_hd_auth_refresh_token", "", this.configuration.refresh_token_persistent);

        gv.set("_hd_auth_api_address", "");
        gv.set("_hd_auth_tenant", "");

        gv.set("_hd_auth_local_dev_user", "");

        this._id_token = null;
        this._access_token = null;
        this._refresh_token = null;
        this._is_active = false;

        this.boost_validation_ticket();

        let new_session :Session = new Session();
        new_session.clone_from(this);
        session.set(new_session);       // forces store subscribers
    }

    public appAccessGroup() : number
    {
        const scopes = this.configuration.scope.split(' ')
        if(scopes && scopes.length > 0)
        {
            const appId = scopes[scopes.length-1];
            return this.accessGroup(appId);
        }
        else
            return 0;
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
        const access: object[] = token.payload['access'];

        if( !!access && 
            access.length > 0)
        {
            const scopeIdx = access.findIndex(e => e['app'] == scope)
            if(scopeIdx < 0)
                return 0;

            const scope: object =  access[scopeIdx];

            const scopeTenants = scope['tenants'];
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

        //console.log('session, setup_mode', m)

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
                //this.set_current_tenant_api(this.configuration.local_api, '')
            }
        }
    }

    public setLocalDevCurrentUser(email :string)
    {
        //console.log('set local user', email);

        gv.set('_hd_auth_local_dev_user', email);

        this.boost_validation_ticket();
        this.validate();

        let new_session :Session = new Session();
        new_session.clone_from(this);
        session.set(new_session);       // forces store subscribers
        
    }

    public get localDevCurrentUser() :string
    {
        let email :string;
        gv.get('_hd_auth_local_dev_user', (v)=>{email=v;});
        return email;
    }
}

export let session :Writable<Session> = writable(new Session);