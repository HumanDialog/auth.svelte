

export enum Mode
{
    Remote,
    Local,
    Disabled
}

export class Local_user
{
    public username:        string;
    public role:            string = "";
    public groupId:         number = 0;
    public uid:             number = 0;
}

export class Configuration
{
    public  mode            :Mode       = Mode.Disabled;
    
    public  iss             :string     = "";
    public  client_id       :string     = "";
    public  client_secret   :string     = "";
    public  scope           :string     = "";

    public  local_api       :string     = "";
    public  local_users     :Local_user[]   = [];

    public  api_version     :string     = "v001";
    public  tenant          :string     = "";
    public  groups_only     :boolean    = false;
    public  ask_organization_name: boolean = true;
    public  let_choose_group_first: boolean = false;

    public  refresh_token_persistent :boolean = true;

    public terms_and_conditions_href :string = "";
    public privacy_policy_href :string = "";
}