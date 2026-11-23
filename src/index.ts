import type { PluginModule } from "@opencode-ai/plugin";
import { thothAgents } from "./agents/thoth.js";
import { loadPluginConfig } from "./config.js";

/**
 * thoth-ddd OpenCode plugin.
 *
 * The `config` hook MERGES the two agents into `config.agent` — it never
 * replaces the object, so built-in agents (plan/build/general/explore) and
 * agents contributed by other plugins survive.
 */
const plugin: PluginModule = {
  id: "thoth-ddd",
  server: async () => ({
    config: async (config) => {
      const userConfig = await loadPluginConfig();
      config.agent = {
        ...config.agent,
        ...thothAgents(userConfig),
      };
    },
  }),
};

export default plugin;
