import { findByProps, findByFilePath, findByName, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { ReactNative } from "@vendetta/metro/common";

const { Pressable } = findByProps("Button", "Text", "View");
const ProfileBanner = findByName("ProfileBanner", false);
const HeaderAvatar = findByFilePath("modules/profile_customization/native/HeaderAvatar.tsx").default;
const { openMediaModal } = findByProps("openMediaModal");
const { hideActionSheet } = findByProps("hideActionSheet");
const { getChannelId } = findByStoreName("SelectedChannelStore");
const { getGuildId } = findByStoreName("SelectedGuildStore");

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        ReactNative.Image.getSize(
            uri,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
        );
    });
}

async function openModal(src: string, event: any) {
    let width = 0;
    let height = 0;

    try {
        ({ width, height } = await getImageSize(src));
    } catch {}

    hideActionSheet();

    openMediaModal({
        initialSources: [{
            uri: src,
            sourceURI: src,
            width,
            height,
            guildId: getGuildId(),
            channelId: getChannelId(),
        }],
        initialIndex: 0,
        originViewOrOriginLayout: {
            width: 0,
            height: 0,
            x: event.pageX,
            y: event.pageY,
            resizeMode: "fill",
        },
    });
}

const unpatchAvatar = after("render", HeaderAvatar, ([{ user, style, guildId }], res) => {
    let ext = "png";

    if (typeof user.guildMemberAvatars?.[guildId] === "string" &&
        user.guildMemberAvatars[guildId].includes("a_")) {
        ext = "gif";
    }

    const guildSpecific =
        user.guildMemberAvatars?.[guildId] &&
        `https://cdn.discordapp.com/guilds/${guildId}/users/${user.id}/avatars/${user.guildMemberAvatars[guildId]}.${ext}?size=4096`;

    const image = user?.getAvatarURL?.(false, 4096, true);
    if (!image) return res;

    const url =
        typeof image === "number"
            ? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`
            : image.replace(".webp", ".png");

    delete res.props.style;

    return (
        <Pressable
            onPress={({ nativeEvent }) =>
                guildSpecific ? openModal(guildSpecific, nativeEvent) : openModal(url, nativeEvent)
            }
            onLongPress={({ nativeEvent }) => openModal(url, nativeEvent)}
            style={style}
        >
            {res}
        </Pressable>
    );
});

const unpatchBanner = after("default", ProfileBanner, ([bannerHeight], res) => {
    const bannerSource = bannerHeight?.bannerSource;

    if (typeof bannerSource?.uri !== "string" || !res) return res;

    const url = `${bannerSource.uri.split("?")[0]}?size=4096`;

    return (
        <Pressable onPress={({ nativeEvent }) => openModal(url, nativeEvent)}>
            {res}
        </Pressable>
    );
});

export function onUnload() {
    unpatchAvatar();
    unpatchBanner();
}
