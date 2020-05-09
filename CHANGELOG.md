# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Use native Date type instead of a library: this gives us more flexibility and improved performance, since there is 
  less Javascript to download when you connect to the website

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

[Unreleased]: https://gitlab.com/rpadovani/daintree/-/compare/v0.2.0...master
[0.2.0]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.2...v0.2.0
[0.1.2]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.1...v0.1.2
[0.1.1]: https://gitlab.com/rpadovani/daintree/-/compare/v0.1.0...v0.1.1
[0.1.0]: https://gitlab.com/rpadovani/daintree/-/tags/v0.1.0
