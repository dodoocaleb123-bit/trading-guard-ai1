# Telegram Recipient Research

## Official sources

1. Telegram Bot API: https://core.telegram.org/bots/api
   The official API describes `sendMessage` as taking a destination `chat_id`; supported destination types include individual users, groups, supergroups, channels, and ephemeral messages within chats. This means the app must know the destination chat ID(s) or use one shared group chat ID.

2. Telegram Bot Features: https://core.telegram.org/bots/features
   Telegram states that bots can interpret commands in private chats and groups. For group delivery, the bot must be added to the group. Privacy mode controls whether it sees all group messages or only explicit commands and mentions. A private `/start` message alone does not make a user an automatic recipient of future outbound messages; the app must store or otherwise manage that chat ID, or send to a shared group chat.

## Design implication

The simplest shared-access option is one private group per asset, with the corresponding bot added to that group and the group chat ID configured in the app. All approved members then see the same paper signals and outcome messages without storing five individual chat IDs. A more granular alternative is an approved subscriber list, where each friend privately starts the bot and provides their chat ID through an owner-approved enrollment workflow; the app then sends each asset message to every approved subscriber. The latter requires recipient storage, authorization, unsubscribe handling, deduplication, and privacy considerations.
