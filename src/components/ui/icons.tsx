/**
 * Icon registry — Lucide icons via deep imports (one module per icon keeps the bundle lean).
 * Usage: <Icon name="house" size={22} color={colors.primary} />
 */
import React from 'react';
import { I18nManager } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import Activity from 'lucide-react-native/icons/activity';
import Apple from 'lucide-react-native/icons/apple';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import AtSign from 'lucide-react-native/icons/at-sign';
import Award from 'lucide-react-native/icons/award';
import Baby from 'lucide-react-native/icons/baby';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import Barcode from 'lucide-react-native/icons/barcode';
import Bath from 'lucide-react-native/icons/bath';
import Bell from 'lucide-react-native/icons/bell';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Bone from 'lucide-react-native/icons/bone';
import BookOpen from 'lucide-react-native/icons/book-open';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Brush from 'lucide-react-native/icons/brush';
import Bug from 'lucide-react-native/icons/bug';
import Building2 from 'lucide-react-native/icons/building';
import Calendar from 'lucide-react-native/icons/calendar';
import CalendarCheck from 'lucide-react-native/icons/calendar-check';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import CalendarClock from 'lucide-react-native/icons/calendar-clock';
import Camera from 'lucide-react-native/icons/camera';
import Car from 'lucide-react-native/icons/car';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import ChartLine from 'lucide-react-native/icons/chart-line';
import ChartPie from 'lucide-react-native/icons/chart-pie';
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import CircleX from 'lucide-react-native/icons/circle-x';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Clock from 'lucide-react-native/icons/clock';
import Coins from 'lucide-react-native/icons/coins';
import Compass from 'lucide-react-native/icons/compass';
import Copy from 'lucide-react-native/icons/copy';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Crown from 'lucide-react-native/icons/crown';
import Download from 'lucide-react-native/icons/download';
import Droplets from 'lucide-react-native/icons/droplets';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Ear from 'lucide-react-native/icons/ear';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FileText from 'lucide-react-native/icons/file-text';
import Filter from 'lucide-react-native/icons/list-filter';
import Flame from 'lucide-react-native/icons/flame';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Gem from 'lucide-react-native/icons/gem';
import Gift from 'lucide-react-native/icons/gift';
import Globe from 'lucide-react-native/icons/globe';
import Grid2x2 from 'lucide-react-native/icons/grid-2x2';
import Hammer from 'lucide-react-native/icons/hammer';
import HandCoins from 'lucide-react-native/icons/hand-coins';
import Heart from 'lucide-react-native/icons/heart';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import Hourglass from 'lucide-react-native/icons/hourglass';
import House from 'lucide-react-native/icons/house';
import Image from 'lucide-react-native/icons/image';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import Info from 'lucide-react-native/icons/info';
import KeyRound from 'lucide-react-native/icons/key-round';
import Lamp from 'lucide-react-native/icons/lamp';
import Languages from 'lucide-react-native/icons/languages';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Link from 'lucide-react-native/icons/link';
import List from 'lucide-react-native/icons/list';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import Locate from 'lucide-react-native/icons/locate';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import Lock from 'lucide-react-native/icons/lock';
import LogIn from 'lucide-react-native/icons/log-in';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapIcon from 'lucide-react-native/icons/map';
import MapPin from 'lucide-react-native/icons/map-pin';
import Mars from 'lucide-react-native/icons/mars';
import Menu from 'lucide-react-native/icons/menu';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageCircleMore from 'lucide-react-native/icons/message-circle-more';
import Minus from 'lucide-react-native/icons/minus';
import Moon from 'lucide-react-native/icons/moon';
import Navigation from 'lucide-react-native/icons/navigation';
import Package from 'lucide-react-native/icons/package';
import Paintbrush from 'lucide-react-native/icons/paintbrush';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Pause from 'lucide-react-native/icons/pause';
import Pencil from 'lucide-react-native/icons/pencil';
import Percent from 'lucide-react-native/icons/percent';
import Phone from 'lucide-react-native/icons/phone';
import Pill from 'lucide-react-native/icons/pill';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Power from 'lucide-react-native/icons/power';
import QrCode from 'lucide-react-native/icons/qr-code';
import Receipt from 'lucide-react-native/icons/receipt';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Repeat from 'lucide-react-native/icons/repeat';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import ScanLine from 'lucide-react-native/icons/scan-line';
import Scissors from 'lucide-react-native/icons/scissors';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Share2 from 'lucide-react-native/icons/share-2';
import Shield from 'lucide-react-native/icons/shield';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Shirt from 'lucide-react-native/icons/shirt';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Smile from 'lucide-react-native/icons/sparkle';
import Sofa from 'lucide-react-native/icons/sofa';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import Store from 'lucide-react-native/icons/store';
import Sun from 'lucide-react-native/icons/sun';
import Syringe from 'lucide-react-native/icons/syringe';
import Tag from 'lucide-react-native/icons/tag';
import Tags from 'lucide-react-native/icons/tags';
import Thermometer from 'lucide-react-native/icons/thermometer';
import Ticket from 'lucide-react-native/icons/ticket';
import Timer from 'lucide-react-native/icons/timer';
import Trash2 from 'lucide-react-native/icons/trash';
import Trees from 'lucide-react-native/icons/trees';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Trophy from 'lucide-react-native/icons/trophy';
import Upload from 'lucide-react-native/icons/upload';
import User from 'lucide-react-native/icons/user';
import UserPlus from 'lucide-react-native/icons/user-plus';
import UserRound from 'lucide-react-native/icons/user-round';
import Users from 'lucide-react-native/icons/users';
import Venus from 'lucide-react-native/icons/venus';
import Wallet from 'lucide-react-native/icons/wallet';
import Waves from 'lucide-react-native/icons/waves-ladder';
import Wind from 'lucide-react-native/icons/wind';
import Wrench from 'lucide-react-native/icons/wrench';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';

type LucideComponent = React.ComponentType<LucideProps>;

export const ICONS = {
  activity: Activity,
  apple: Apple,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'at-sign': AtSign,
  award: Award,
  baby: Baby,
  'badge-check': BadgeCheck,
  barcode: Barcode,
  bath: Bath,
  bell: Bell,
  'bell-ring': BellRing,
  bone: Bone,
  'book-open': BookOpen,
  briefcase: Briefcase,
  brush: Brush,
  bug: Bug,
  'building-2': Building2,
  calendar: Calendar,
  'calendar-check': CalendarCheck,
  'calendar-days': CalendarDays,
  'calendar-clock': CalendarClock,
  camera: Camera,
  car: Car,
  'chart-column': ChartColumn,
  'chart-line': ChartLine,
  'chart-pie': ChartPie,
  check: Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-help': CircleHelp,
  'circle-user-round': CircleUserRound,
  'circle-x': CircleX,
  'clipboard-list': ClipboardList,
  clock: Clock,
  coins: Coins,
  compass: Compass,
  copy: Copy,
  'credit-card': CreditCard,
  crown: Crown,
  download: Download,
  droplets: Droplets,
  dumbbell: Dumbbell,
  ear: Ear,
  ellipsis: Ellipsis,
  'ellipsis-vertical': EllipsisVertical,
  'external-link': ExternalLink,
  eye: Eye,
  'eye-off': EyeOff,
  'file-text': FileText,
  filter: Filter,
  flame: Flame,
  'flask-conical': FlaskConical,
  'flower-2': Flower2,
  gem: Gem,
  gift: Gift,
  globe: Globe,
  'grid-2x2': Grid2x2,
  hammer: Hammer,
  'hand-coins': HandCoins,
  heart: Heart,
  'heart-pulse': HeartPulse,
  hourglass: Hourglass,
  house: House,
  image: Image,
  'image-plus': ImagePlus,
  info: Info,
  'key-round': KeyRound,
  lamp: Lamp,
  languages: Languages,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  link: Link,
  list: List,
  'loader-circle': LoaderCircle,
  locate: Locate,
  'locate-fixed': LocateFixed,
  lock: Lock,
  'log-in': LogIn,
  'log-out': LogOut,
  mail: Mail,
  map: MapIcon,
  'map-pin': MapPin,
  mars: Mars,
  menu: Menu,
  'message-circle': MessageCircle,
  'message-circle-more': MessageCircleMore,
  minus: Minus,
  moon: Moon,
  navigation: Navigation,
  package: Package,
  paintbrush: Paintbrush,
  'party-popper': PartyPopper,
  pause: Pause,
  pencil: Pencil,
  percent: Percent,
  phone: Phone,
  pill: Pill,
  play: Play,
  plus: Plus,
  power: Power,
  'qr-code': QrCode,
  receipt: Receipt,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  'rotate-ccw': RotateCcw,
  'scan-line': ScanLine,
  scissors: Scissors,
  search: Search,
  'search-x': SearchX,
  send: Send,
  settings: Settings,
  'settings-2': Settings2,
  'share-2': Share2,
  shield: Shield,
  'shield-check': ShieldCheck,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'sliders-horizontal': SlidersHorizontal,
  smartphone: Smartphone,
  smile: Smile,
  sofa: Sofa,
  sparkles: Sparkles,
  star: Star,
  stethoscope: Stethoscope,
  store: Store,
  sun: Sun,
  syringe: Syringe,
  tag: Tag,
  tags: Tags,
  thermometer: Thermometer,
  ticket: Ticket,
  timer: Timer,
  'trash-2': Trash2,
  trees: Trees,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'triangle-alert': TriangleAlert,
  trophy: Trophy,
  upload: Upload,
  user: User,
  'user-plus': UserPlus,
  'user-round': UserRound,
  users: Users,
  venus: Venus,
  wallet: Wallet,
  waves: Waves,
  wind: Wind,
  wrench: Wrench,
  x: X,
  zap: Zap,
} satisfies Record<string, LucideComponent>;

export type IconName = keyof typeof ICONS;

/** Icons that point in a reading direction and must flip in RTL. */
const DIRECTIONAL: Partial<Record<IconName, IconName>> = {
  'chevron-left': 'chevron-right',
  'chevron-right': 'chevron-left',
  'arrow-left': 'arrow-right',
  'arrow-right': 'arrow-left',
  'log-in': 'log-in',
  'log-out': 'log-out',
};

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** flip according to RTL (for chevrons/arrows). Default true for directional icons. */
  rtlAware?: boolean;
  style?: LucideProps['style'];
}

export const isIconName = (name: string): name is IconName => name in ICONS;

export const Icon = React.memo(function Icon({ name, size = 22, color = '#231A18', strokeWidth = 1.8, rtlAware = true, style }: IconProps) {
  let resolved: IconName = isIconName(name) ? name : 'circle-help';
  if (rtlAware && I18nManager.isRTL && DIRECTIONAL[resolved]) resolved = DIRECTIONAL[resolved] as IconName;
  const Cmp = ICONS[resolved] as LucideComponent;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
});

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Curated icons for category/subcategory pickers in the admin workspace. */
export const CATEGORY_ICON_CHOICES: IconName[] = [
  'stethoscope', 'dumbbell', 'scissors', 'house', 'building-2', 'heart-pulse', 'eye', 'smile', 'baby', 'bone', 'ear', 'apple', 'activity',
  'flask-conical', 'scan-line', 'syringe', 'pill', 'thermometer', 'waves', 'flame', 'zap', 'shield', 'brush', 'paintbrush', 'sparkles',
  'droplets', 'flower-2', 'gem', 'shirt', 'bath', 'sofa', 'lamp', 'trees', 'hammer', 'wrench', 'car', 'bug', 'wind', 'clock', 'package',
  'shopping-bag', 'store', 'briefcase', 'layout-grid', 'grid-2x2', 'star', 'crown', 'trophy', 'camera', 'book-open',
];
