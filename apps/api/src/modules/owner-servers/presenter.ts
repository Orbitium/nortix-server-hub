export const presentOwnerPluginState = (input: {
  pluginInstanceId: string | null;
  pluginLastSeenAt: Date | null;
}) => ({
  connected: Boolean(input.pluginInstanceId),
  lastSeenAt: input.pluginLastSeenAt,
});
