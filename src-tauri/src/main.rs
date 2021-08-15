#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
}

use tauri::{CustomMenuItem, Menu, Submenu, MenuItem};

fn main() {
    /* Network menu */
    let vpcs = CustomMenuItem::new("/network/vpcs".to_string(), "VPCs");
    let subnets = CustomMenuItem::new("/network/subnets".to_string(), "Subnets");
    let igws = CustomMenuItem::new("/network/igws".to_string(), "Internet Gateways");
    let nats = CustomMenuItem::new("/network/nats".to_string(), "Nat Gateways");
    let rts = CustomMenuItem::new("/network/routeTables".to_string(), "Route Tables");
    let ips = CustomMenuItem::new("/network/eips".to_string(), "Elastic IPs");
    let sgs = CustomMenuItem::new("/network/securityGroups".to_string(), "Security Groups");
    let pcs = CustomMenuItem::new("/network/peeringConnections".to_string(), "Peering connections");
    let endpoints = CustomMenuItem::new("/network/endpoints".to_string(), "Endpoints");
    let enis = CustomMenuItem::new("/network/interfaces".to_string(), "Network interfaces");
    let dhcp_options = CustomMenuItem::new("/network/dhcp".to_string(), "DHCP options sets");
    let network = Submenu::new("Network", Menu::new()
        .add_item(vpcs)
        .add_item(subnets)
        .add_item(igws)
        .add_item(nats)
        .add_item(rts)
        .add_item(ips)
        .add_item(sgs)
        .add_item(pcs)
        .add_item(endpoints)
        .add_item(enis)
        .add_item(dhcp_options)
    );

    /* EC2 menu */
    let instances = CustomMenuItem::new("/ec2/instances".to_string(), "Instances");
    let load_balancers = CustomMenuItem::new("/ec2/load_balancers".to_string(), "Load Balancers");
    let target_groups = CustomMenuItem::new("/ec2/target_groups".to_string(), "Target groups");
    let key_pairs = CustomMenuItem::new("/ec2/key_pairs".to_string(), "Key pairs");
    let volumes = CustomMenuItem::new("/ec2/volumes".to_string(), "EBS volumes");
    let snapshots = CustomMenuItem::new("/ec2/snapshots".to_string(), "EBS snapshots");
    let ec2 = Submenu::new("EC2", Menu::new()
        .add_item(instances)
        .add_item(load_balancers)
        .add_item(target_groups)
        .add_item(key_pairs)
        .add_item(volumes)
        .add_item(snapshots)
    );

    /* ECS menu */
    let task_definitions = CustomMenuItem::new("#/ecs/tasksDefinitions".to_string(), "Tasks definitions");
    let clusters = CustomMenuItem::new("#/ecs/clusters".to_string(), "Clusters");
    let ecs = Submenu::new("ECS", Menu::new()
        .add_item(task_definitions)
        .add_item(clusters)
    );

    /* SNS menu */
    let sns_topics = CustomMenuItem::new("#/messages/sns_topics".to_string(), "SNS Topics");
    let sns_subscriptions = CustomMenuItem::new("#/messages/sns_subscriptions".to_string(), "SNS Subscriptions");
    let sqs = CustomMenuItem::new("#/messages/sqs".to_string(), "SQS");
    let messages = Submenu::new("Messages", Menu::new()
        .add_item(sns_topics)
        .add_item(sns_subscriptions)
        .add_item(sqs)
    );

    let navigate = Submenu::new("Resources", Menu::new()
        .add_submenu(network)
        .add_submenu(ec2)
        .add_submenu(ecs)
        .add_submenu(messages)
    );

    let select_regions = CustomMenuItem::new("regions".to_string(), "Select regions");
    let switch_role = CustomMenuItem::new("switch_role".to_string(), "Switch role");
    let preferences = Submenu::new("Preferences", Menu::new()
        .add_item(select_regions)
        .add_item(switch_role)
    );


    let changelog = CustomMenuItem::new("/changelog".to_string(), "Changelog");
    let features = CustomMenuItem::new("/about".to_string(), "Features");
    let contribute = CustomMenuItem::new("/contribute".to_string(), "Contribute");
    let about = Submenu::new("About", Menu::new()
        .add_item(changelog)
        .add_item(features)
        .add_item(contribute)
    );

    let menu = Menu::new()
        .add_submenu(preferences)
        .add_submenu(navigate)
        .add_submenu(about);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "regions" => {
                    event.window().emit("show_regions_modal", ());
                }
                "switch_role" => {
                    event.window().emit("show_switch_role_modal", ());
                }
                _ => {
                    event.window().emit("navigate_to", Payload { message: event.menu_item_id().into() }).unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
