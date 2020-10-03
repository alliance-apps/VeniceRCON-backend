# VeniceRCON

Documentation about this Software can be found [here](https://alliance-apps.github.io/VeniceRCON-documentation/)

# Milestones

- [ ] Plugin Repositories

# Plugin Repository

  - repository.yaml

Structure of **repository.yaml**, this file contains all relevant plugins

```typescript
type Repository = {
  plugins: {
    name: string, //plugin name
    description: string, //plugin description of what the plugin does
    version: string, //semantic version string of the plugin
    repository: string, //url to github repository
    commit: string //commit string to use
  }[]
}
```