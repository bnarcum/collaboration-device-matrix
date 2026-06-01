// Product photos: Cisco brochure extract + partner vendor CDNs.
// Regenerate partner URLs: python3 scripts/import-product-images.py
//
// Devices without an entry use stylized 3D primitives in DeviceModel.tsx.

const base = `${import.meta.env.BASE_URL ?? '/'}devices/`

function img(hash: string): string {
  return `${base}img-${hash}.webp`
}

export const DEVICE_IMAGES: Record<string, string> = {
  // Cisco (Collaboration Device Product Matrix brochure)
  // Boards & integrators (pages 3–5).
  // The brochure only contains two Board Pro G2 hero shots: a 3/4-angle
  // wall-mount that looks tilted once the page background is removed,
  // and a clean head-on floor-stand shot. We use the latter for both
  // sizes — the billboards still scale to the device's `size` entry, so
  // the 75" reads visibly larger than the 55".
  'board-pro-g2-55': img('7a4fbdb9f3'),
  'board-pro-g2-75': img('7a4fbdb9f3'),
  'room-kit-eqx': img('e7c7a7391f'),
  'room-bar-byod': img('4519aeafbe'),

  // Room bars & integrators (pages 6–10)
  'room-bar': img('5930e7bad9'),
  'room-bar-pro': img('985d42e216'),
  'room-kit-eq': img('5dffa60f11'),
  'room-kit-pro-g2': img('d451a37ab5'),

  // Desk series (pages 11–12)
  desk: img('6717ba491e'),
  'desk-pro-g2': img('1dc86014d2'),
  'desk-mini': img('6b3e2bab98'),

  // Phones (pages 13–20)
  'wireless-9821': img('31dabe8c8e'),
  'wireless-860': img('cbda5ccce5'),
  'dect-6825': img('afc9a47cad'),
  'conference-8832': img('68cffcece7'),
  'video-phone-8875': img('88ecdadfd5'),
  'desk-phone-9871': img('ed426f8af7'),
  'desk-phone-9841': img('8610de7dca'),

  // Headsets & earbuds (pages 21–22)
  'headset-320': img('25c4f2bbed'),
  'headset-520': img('5ada38fb4a'),
  'headset-560': img('bf6dfa019e'),
  'headset-730': img('8cb7938ed5'),
  'headset-bang-olufsen-900': img('976ab4d643'),
  'headset-950': img('8d6d12dc7d'),

  // Room navigators (page 23)
  'room-navigator-table': img('4b0fa15cf0'),
  'room-navigator-wall': img('2bfc3204c8'),

  // Microphones (page 24)
  'table-mic-pro': img('cbe669d0f2'),
  'ceiling-mic-pro': img('e0e483ccb3'),
  'table-mic': img('76da3a5033'),
  'ceiling-mic': img('3b82ce6285'),

  // Cameras (pages 25–26)
  'desk-camera-1080': img('adb4b47794'),
  'desk-camera-4k': img('d293d11020'),
  'quad-camera': img('12b412d18f'),
  'room-vision-ptz': img('37e1d7469f'),
  'ptz-4k-camera': img('167ce81553'),

  // Logitech
  'logitech-rally-bar': img('1c90cf84a7'),
  'logitech-rally-bar-mini': img('1c90cf84a7'),
  'logitech-rally-plus': img('abf2a6e02e'),
  'logitech-meetup': img('f9c87ca142'),
  'logitech-rally-camera': img('9ae771b7ff'),
  'logitech-sight': img('0236d2e6ab'),
  'logitech-scribe': img('617a472d34'),
  'logitech-tap-ip': img('3794871772'),
  'logitech-tap-usb': img('3794871772'),
  'logitech-tap-scheduler': img('3794871772'),
  'logitech-zone-wired-2': img('6a9de81a1c'),
  'logitech-zone-wireless-2': img('8aea014d0e'),
  'logitech-zone-vibe-wireless': img('3a7a7a1025'),
  'logitech-zone-true-wireless': img('909cac3801'),

  // Poly
  'poly-studio-x30': img('9bd5819319'),
  'poly-studio-x50': img('0e4531c4c5'),
  'poly-studio-x52': img('98235e90f1'),
  'poly-studio-x70': img('84668eb029'),
  'poly-studio-x72': img('84668eb029'),
  'poly-studio-g62': img('bc86246618'),
  'poly-studio-e70': img('8cda54d1a5'),
  'poly-studio-p15': img('e1fd87d010'),
  'poly-edge-b10': img('61a8c90ab5'),
  'poly-edge-b20': img('7eb549f644'),
  'poly-edge-b30': img('09a86f89b5'),
  'poly-ccx-400': img('0f54495159'),
  'poly-ccx-505': img('1d5386b5fc'),
  'poly-ccx-600': img('d4dbd3aa96'),
  'poly-ccx-700': img('e2fba1fe7a'),
  'poly-trio-8300': img('0e15fb617d'),
  'poly-trio-8500': img('cb75052c06'),
  'poly-trio-8800': img('cb75052c06'),
  'poly-blackwire-5200': img('c0a62ae7c3'),
  'poly-blackwire-8225': img('e8d70d4507'),
  'poly-voyager-4300': img('da6d23e902'),
  'poly-voyager-5200': img('ba9fa3f6e6'),
  'poly-voyager-focus-2': img('e0546342cc'),
  'poly-savi-7310': img('10c7678707'),
  'poly-encorepro-710': img('09c746c559'),

  // Neat — board-50 for 50"; board-pro for 65"/75" (Neat CDN has no separate
  // 75" hero; aspect-aware billboards scale by catalog display size).
  'neat-bar': img('04aa1ce950'),
  'neat-bar-pro': img('20c499ca7f'),
  'neat-board-50': img('24178b0429'),
  'neat-board-65': img('c53e48c61a'),
  'neat-board-pro-75': img('c53e48c61a'),
  'neat-pad': img('47944f7e5c'),
  'neat-pad-pro': img('e699edb24c'),
  'neat-frame': img('4c96f58d7b'),
  'neat-center': img('46f6c4a322'),
}

/**
 * Width ÷ height of each product photo (from public/devices WebP assets).
 * Used for billboard layout before textures finish loading.
 */
export const DEVICE_PHOTO_ASPECT: Readonly<Partial<Record<string, number>>> = {
  'board-pro-g2-55': 1.5097,
  'board-pro-g2-75': 1.5097,
  'neat-board-50': 0.6061,
  'neat-board-65': 0.6446,
  'neat-board-pro-75': 0.6446,
  'room-kit-eqx': 2.0479,
  'room-bar-byod': 2.5336,
  'room-bar': 1.8635,
  'room-bar-pro': 2.1417,
  'room-kit-eq': 2.1504,
  'room-kit-pro-g2': 1.3037,
  'desk-pro-g2': 1.1606,
  'desk-mini': 1.2685,
  'wireless-9821': 1.0703,
  'wireless-860': 0.5444,
  'dect-6825': 1.0698,
  'conference-8832': 1.64,
  'video-phone-8875': 3.0,
  'desk-phone-9871': 1.6942,
  'desk-phone-9841': 1.6098,
  'headset-320': 0.9069,
  'headset-520': 1.0543,
  'headset-560': 0.6588,
  'headset-730': 1.3493,
  'headset-bang-olufsen-900': 1.4545,
  'headset-950': 1.4545,
  'room-navigator-table': 2.2171,
  'room-navigator-wall': 1.1516,
  'table-mic-pro': 1.6308,
  'ceiling-mic-pro': 0.9855,
  'table-mic': 0.993,
  'ceiling-mic': 1.0105,
  'desk-camera-1080': 1.9201,
  'desk-camera-4k': 1.3388,
  'quad-camera': 2.2811,
  'room-vision-ptz': 1.4755,
  'ptz-4k-camera': 1.4755,
  'logitech-rally-bar': 2.991,
  'logitech-rally-bar-mini': 2.991,
  'logitech-rally-plus': 3.3816,
  'logitech-meetup': 3.8539,
  'logitech-rally-camera': 1.7903,
  'logitech-sight': 1.7013,
  'logitech-scribe': 1.3872,
  'logitech-tap-ip': 1.99,
  'logitech-tap-usb': 1.99,
  'logitech-tap-scheduler': 1.99,
  'logitech-zone-wired-2': 1.1647,
  'logitech-zone-wireless-2': 1.1647,
  'logitech-zone-vibe-wireless': 1.1647,
  'logitech-zone-true-wireless': 1.1647,
  'poly-studio-x30': 6.9425,
  'poly-studio-x50': 2.5455,
  'poly-studio-x52': 5.7407,
  'poly-studio-x70': 5.3982,
  'poly-studio-x72': 5.3982,
  'poly-studio-g62': 3.1812,
  'poly-studio-e70': 2.364,
  'poly-studio-p15': 1.6879,
  'poly-edge-b10': 1.0725,
  'poly-edge-b20': 0.8213,
  'poly-edge-b30': 0.8438,
  'poly-ccx-400': 0.935,
  'poly-ccx-505': 0.9331,
  'poly-ccx-600': 2.5354,
  'poly-ccx-700': 1.1258,
  'poly-trio-8300': 2.1453,
  'poly-trio-8500': 2.1763,
  'poly-trio-8800': 2.1763,
  'poly-blackwire-5200': 0.6673,
  'poly-blackwire-8225': 0.5624,
  'poly-voyager-4300': 1.0197,
  'poly-voyager-5200': 0.8917,
  'poly-voyager-focus-2': 0.605,
  'poly-savi-7310': 0.7819,
  'poly-encorepro-710': 0.9035,
  'neat-bar': 2.5463,
  'neat-bar-pro': 2.6119,
  'neat-pad': 0.8494,
  'neat-pad-pro': 0.6401,
  'neat-frame': 0.4549,
  'neat-center': 0.315,
}

export function devicePhotoAspect(deviceId: string): number | undefined {
  return DEVICE_PHOTO_ASPECT[deviceId]
}

export function deviceImage(deviceId: string): string | undefined {
  return DEVICE_IMAGES[deviceId]
}
