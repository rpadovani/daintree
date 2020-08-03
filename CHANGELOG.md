# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Improve tags table performance, and add loading indicator
- Add monitoring tab to ECS clusters

## [0.9.0]

### Added

- Add support for VPC endpoints
- Add support for network interfaces
- Add security groups tab to the VPC page
- Add network interfaces tab to subnet, security group, and VPC page
- Add instructions for self hosting

### Changed

- Improved the security groups tab in the Load Balancer page
- Improved network tab for instance page

## [0.8.1]

### Changed

- Add announcement bar when a new version is released
- New, cleaner, homepage
- Prerender the new homepage to maximize performance

### Fixed

- Fix missing loading animation while logging in

## [0.8.0]

### Added

- Support for ECS clusters

### Changed

- Refactor header and subheader to render just once and increase performance
- Move all components to new-ish Daintree classes to have coherent codebase
- Delete a lot of useless code
- Hovering the reload icon now shows the date of the last refresh
- Improve the alerts UI
- Improve the elastic ip, and the route table page: now they perform better when multiple changes are applied, and they always show updated data

### Fixed

- Remove internal error notification on login
- Fix 404 after creating a new peering connection
- Fix title and cancel button in the new sns topic page

## [0.7.0]

### Added

- Add support for ECS tasks
- Improve the layout of the cards in pages about single resources, now it is responsive
- Add help text to a lot of resources' attributes

### Changed

- Refactored the tags table to use more modern Javascript
- Highlight when the owner of a resource is the logged user
- Improve legend of graphs including minimum and current

### Fixed

- Fix `The filter 'vpc' is invalid` error when checking route tables associated to a VPC
- Fix broken link to instance from elastic ip page
- Remove warning about expired credentials after login

## [0.6.0]

### Added

- Support for VPC peering connections
- Instances and NAT gateways shows now also related route tables

## [0.5.0]

### Added

- Added support for EBS
- Added support for Snapshots
- Added a list of EC2 related instances to VPCs, subnets, EBS, and key pairs page: you can now see in a glance how such resources are linked to any of your instances!
- Added [Github](https://github.com/rpadovani/daintree) mirroring of the source code! If you want, you can follow development of the project also over there!

### Changed

- More coherent notifications when deleting resources
- Changed label style for Load Balancers and Instances status (thanks Gitlab developers!)

### Fixed

- Resources IDs in the URL are not case-sensitive anymore, fixing some broken internal link
- Improved how Daintree detects a work in progress resource
- Fixed a memory leak in displaying CloudWatch widgets

## [0.4.0]

### Added

- Added support for EC2 key pairs!

### Changed

- Increase responsiveness: now many pages behave better on small screens

### Fixed

- Now Daintree will detect when your credentials expire and will redirect you to the login page
- Fixed integration with @gitlab/ui library. Thanks [Paul Gascou-Vaillancourt](https://gitlab.com/pgascouvaillancourt) for suggestions and improvements upstream!

## [0.3.0]

### Added

- Added support for load balancers and target groups

### Changed

- Improved style of the header dropdown, now uses Gitlab components instead of VueBootstrap ones

## [0.2.1]

### Changed

- Use native Date type instead of a library: this gives us more flexibility and improved performance, since there is 
  less Javascript to download when you connect to the website
- Remove unused CSS for flags
- You can now manage tags for EC2 instances as you could already do for other resources

### Fixed

- Tags operations for networking resources work again

## [0.2.0]

### Added

- Created a new Cloudwatch component to show graphs about a single resource
- Used the new Cloudwatch component to provide information about SQS, Nat Gateways, EC2 instances
- Daintree now uses the session storage to keep your credentials: it means you can reload the page, and you are still 
  logged in! Of course, as soon as you close the tab, the browser will delete everything from the session storage, so 
  your credentials are perfectly safe;
- When you switch role, you can now save it: this way the next time you use Daintree you don't need to insert data 
  about your role anymore! Daintree stores on your browser only metadata about the role, and not the actual credentials.
  
### Changed

- The secret access key field during the login is now marked as a password

## [0.1.2]

### Fixed

- Fix features and homepage rendering on mobile phones
- Fix how Changelog page renders multiple contents
- Show the region selector on login, if no regions were previously selected

## [0.1.1]

### Changed

- Improve loading performance optimizing AWS library imports. The vendors file went from 3288.93 KiB to 933.97 KiB.
- Improve Changelog page aspect
- Bigger GIFs in the feature page

### Fixed

- The header now properly collapse on mobile
- The homepage renders in the same way on Chrome and Firefox
- Add meta description in the index page

## [0.1.0]

### Added

- First public release, with basic support for Networking, EC2, SQS, and SNS.

[Unreleased]: https://gitlab.com/rpadovani/daintree/-/compare/v0.9.0...master
[0.9.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.8.1...v0.9.0
[0.8.1]: https://gitlab.com/rpadovani/daintree/-/compare/v0.8.0...v0.8.1
[0.8.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.7.0...v0.8.0
[0.7.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.6.0...v0.7.0
[0.6.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.5.0...v0.6.0
[0.5.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.4.0...v0.5.0
[0.4.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.3.0...v0.4.0
[0.3.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.2.1...v0.3.0
[0.2.1]: https://gitlab.com/rpadovani/daintree/-/compare/v0.2.0...v0.2.1
[0.2.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.2...v0.2.0
[0.1.2]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.1...v0.1.2
[0.1.1]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.0...v0.1.1
[0.1.0]: https://gitlab.com/rpadovani/daintree/-/tags/v0.1.0
