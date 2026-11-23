// Parcels: track deliveries by tracking number, and save orders automatically from order confirmation pages.
// A parcel stays until it is delivered. Status is read from the carrier's or shop's own page, in the background,
// with the user's own session, so signed-in order pages work too.
const { Store } = require('./store')

const store = new Store('parcels', [])   // { id, number, carrier, name, url, shop, orderNo, status, statusText, added, checked, delivered, source }
const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

const clean = n => String(n || '').toUpperCase().replace(/[\s-]/g, '')
// ------------------------------------------------------------ carriers
// [id, name, region, tracking page ({n} = the number), or '' to look it up on 17track, which covers every carrier here]
const T17 = 'https://t.17track.net/en#nums={n}'
const LIST = [
  // Global express
  ['ups', 'UPS', 'Global', 'https://www.ups.com/track?tracknum={n}'],
  ['fedex', 'FedEx', 'Global', 'https://www.fedex.com/fedextrack/?trknbr={n}'],
  ['dhl', 'DHL Express', 'Global', 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}'],
  ['dhlecommerce', 'DHL eCommerce', 'Global', 'https://webtrack.dhlecs.com/?trackingnumber={n}'],
  ['amazon', 'Amazon', 'Global', 'https://track.amazon.com/tracking/{n}'],
  ['aramex', 'Aramex', 'Global', 'https://www.aramex.com/us/en/track/results?mode=0&ShipmentNumber={n}'],
  ['tnt', 'TNT', 'Global', 'https://www.tnt.com/express/en_gc/site/shipping-tools/tracking.html?searchType=con&cons={n}'],
  ['dpd', 'DPD', 'Global', 'https://tracking.dpd.de/status/en_US/parcel/{n}'],
  ['gls', 'GLS', 'Global', 'https://gls-group.com/track/{n}'],
  ['ems', 'EMS', 'Global', ''],
  ['sfexpress', 'SF Express', 'Global', 'https://www.sf-express.com/we/ow/chn/en/waybill/waybill-detail/{n}'],
  ['cainiao', 'Cainiao', 'Global', 'https://global.cainiao.com/newDetail.htm?mailNoList={n}'],
  ['yunexpress', 'YunExpress', 'Global', 'https://www.yuntrack.com/parcelTracking?id={n}'],
  ['4px', '4PX', 'Global', 'https://track.4px.com/#/result/0/{n}'],
  ['yanwen', 'Yanwen', 'Global', ''],
  ['asendia', 'Asendia', 'Global', 'https://a1.asendiausa.com/tracking/?trackingnumber={n}'],
  ['pitneybowes', 'Pitney Bowes', 'Global', 'https://tracking.pb.com/{n}'],
  ['imile', 'iMile', 'Global', ''],
  ['jtexpress', 'J&T Express', 'Global', ''],
  ['ninjavan', 'Ninja Van', 'Global', 'https://www.ninjavan.co/en-sg/tracking?id={n}'],
  ['shein', 'SHEIN shipping', 'Global', ''],
  ['temu', 'Temu shipping', 'Global', ''],
  ['aliexpress', 'AliExpress shipping', 'Global', ''],
  // United States and Canada
  ['usps', 'USPS', 'USA and Canada', 'https://tools.usps.com/go/TrackConfirmAction?tLabels={n}'],
  ['ontrac', 'OnTrac', 'USA and Canada', 'https://www.ontrac.com/tracking/?number={n}'],
  ['lasership', 'LaserShip', 'USA and Canada', 'https://www.lasership.com/track/{n}'],
  ['veho', 'Veho', 'USA and Canada', ''],
  ['uniuni', 'UniUni', 'USA and Canada', ''],
  ['speedee', 'Spee-Dee Delivery', 'USA and Canada', 'https://speedeedelivery.com/track-a-shipment/?barcodes={n}'],
  ['lso', 'LSO', 'USA and Canada', ''],
  ['gso', 'GLS US', 'USA and Canada', ''],
  ['estes', 'Estes Express', 'USA and Canada', 'https://www.estes-express.com/myestes/shipment-tracking/?type=PRO&query={n}'],
  ['canadapost', 'Canada Post', 'USA and Canada', 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={n}'],
  ['purolator', 'Purolator', 'USA and Canada', 'https://www.purolator.com/en/shipping/tracker?pin={n}'],
  ['canpar', 'Canpar', 'USA and Canada', 'https://www.canpar.com/en/tracking/track.htm?barcode={n}'],
  ['intelcom', 'Intelcom', 'USA and Canada', ''],
  // Latin America
  ['correiosbr', 'Correios (Brazil)', 'Latin America', ''],
  ['jadlog', 'Jadlog', 'Latin America', ''],
  ['correosmx', 'Correos de Mexico', 'Latin America', ''],
  ['estafeta', 'Estafeta', 'Latin America', ''],
  ['correoar', 'Correo Argentino', 'Latin America', ''],
  ['andreani', 'Andreani', 'Latin America', ''],
  ['chilexpress', 'Chilexpress', 'Latin America', ''],
  ['servientrega', 'Servientrega', 'Latin America', ''],
  // UK and Ireland
  ['royalmail', 'Royal Mail', 'UK and Ireland', 'https://www.royalmail.com/track-your-item#/tracking-results/{n}'],
  ['parcelforce', 'Parcelforce', 'UK and Ireland', 'https://www.parcelforce.com/track-trace?trackNumber={n}'],
  ['evri', 'Evri', 'UK and Ireland', 'https://www.evri.com/track/parcel/{n}'],
  ['yodel', 'Yodel', 'UK and Ireland', 'https://www.yodel.co.uk/tracking/{n}'],
  ['dpduk', 'DPD UK', 'UK and Ireland', 'https://track.dpd.co.uk/parcels/{n}'],
  ['dx', 'DX', 'UK and Ireland', ''],
  ['apc', 'APC Overnight', 'UK and Ireland', ''],
  ['inpostuk', 'InPost UK', 'UK and Ireland', ''],
  ['anpost', 'An Post', 'UK and Ireland', 'https://www.anpost.com/Post-Parcels/Track/History?item={n}'],
  ['nuvo', 'Nuvo (Fastway)', 'UK and Ireland', ''],
  // Europe
  ['deutschepost', 'Deutsche Post and DHL Paket', 'Europe', 'https://www.dhl.de/en/privatkunden/pakete-empfangen/verfolgen.html?piececode={n}'],
  ['hermesde', 'Hermes Germany', 'Europe', ''],
  ['postnl', 'PostNL', 'Europe', 'https://jouw.postnl.nl/track-and-trace/{n}'],
  ['bpost', 'bpost', 'Europe', 'https://track.bpost.cloud/btr/web/#/search?itemCode={n}'],
  ['laposte', 'La Poste and Colissimo', 'Europe', 'https://www.laposte.fr/outils/suivre-vos-envois?code={n}'],
  ['chronopost', 'Chronopost', 'Europe', 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={n}'],
  ['mondialrelay', 'Mondial Relay', 'Europe', ''],
  ['austrianpost', 'Austrian Post', 'Europe', 'https://www.post.at/s/sendungsdetails?snr={n}'],
  ['swisspost', 'Swiss Post', 'Europe', 'https://service.post.ch/ekp-web/ui/entry/shipping/1/?formattedParcelCodes={n}'],
  ['posteitaliane', 'Poste Italiane', 'Europe', ''],
  ['brt', 'BRT', 'Europe', ''],
  ['sda', 'SDA', 'Europe', ''],
  ['correos', 'Correos (Spain)', 'Europe', 'https://www.correos.es/es/en/tools/tracker/items/details?tracking-number={n}'],
  ['seur', 'SEUR', 'Europe', ''],
  ['mrw', 'MRW', 'Europe', ''],
  ['ctt', 'CTT (Portugal)', 'Europe', ''],
  ['postnord', 'PostNord', 'Europe', 'https://www.postnord.se/en/our-tools/track-and-trace?shipmentId={n}'],
  ['bring', 'Posten Bring', 'Europe', 'https://tracking.bring.com/tracking/{n}'],
  ['posti', 'Posti', 'Europe', 'https://www.posti.fi/en/tracking#/lahetys/{n}'],
  ['inpost', 'InPost', 'Europe', 'https://inpost.pl/sledzenie-przesylek?number={n}'],
  ['pocztapolska', 'Poczta Polska', 'Europe', ''],
  ['packeta', 'Packeta', 'Europe', 'https://tracking.packeta.com/en/?id={n}'],
  ['ceskaposta', 'Czech Post', 'Europe', ''],
  ['magyarposta', 'Magyar Posta', 'Europe', ''],
  ['elta', 'ELTA Hellenic Post', 'Europe', ''],
  ['acs', 'ACS Courier', 'Europe', ''],
  ['novaposhta', 'Nova Poshta', 'Europe', 'https://novaposhta.ua/en/tracking/?cargo_number={n}'],
  ['ukrposhta', 'Ukrposhta', 'Europe', ''],
  ['russianpost', 'Russian Post', 'Europe', 'https://www.pochta.ru/tracking#{n}'],
  ['cdek', 'CDEK', 'Europe', ''],
  ['ptt', 'PTT (Turkey)', 'Europe', ''],
  ['yurtici', 'Yurtici Kargo', 'Europe', ''],
  ['araskargo', 'Aras Kargo', 'Europe', ''],
  ['mngkargo', 'MNG Kargo', 'Europe', ''],
  ['trendyol', 'Trendyol Express', 'Europe', ''],
  // Middle East and North Africa
  ['smsa', 'SMSA Express', 'Middle East', 'https://www.smsaexpress.com/trackingdetails?tracknumbers={n}'],
  ['saudipost', 'Saudi Post (SPL)', 'Middle East', 'https://splonline.com.sa/en/shipmentdetailsstatic/?tid={n}'],
  ['naqel', 'Naqel Express', 'Middle East', ''],
  ['zajil', 'Zajil', 'Middle East', ''],
  ['aymakan', 'AyMakan', 'Middle East', ''],
  ['thabit', 'Thabit', 'Middle East', ''],
  ['ajex', 'AJEX', 'Middle East', ''],
  ['shipa', 'Shipa', 'Middle East', ''],
  ['noonexpress', 'Noon delivery', 'Middle East', ''],
  ['emiratespost', 'Emirates Post', 'Middle East', ''],
  ['jeebly', 'Jeebly', 'Middle East', ''],
  ['quiqup', 'Quiqup', 'Middle East', ''],
  ['qatarpost', 'Qatar Post', 'Middle East', ''],
  ['kuwaitpost', 'Kuwait Post', 'Middle East', ''],
  ['omanpost', 'Oman Post', 'Middle East', ''],
  ['bahrainpost', 'Bahrain Post', 'Middle East', ''],
  ['jordanpost', 'Jordan Post', 'Middle East', ''],
  ['israelpost', 'Israel Post', 'Middle East', 'https://doar.israelpost.co.il/en/deliverytracking?itemcode={n}'],
  ['egyptpost', 'Egypt Post', 'Middle East', ''],
  ['bosta', 'Bosta', 'Middle East', ''],
  ['baridmaghrib', 'Barid Al-Maghrib', 'Middle East', ''],
  ['algerieposte', 'Algerie Poste', 'Middle East', ''],
  ['tunisiepost', 'La Poste Tunisienne', 'Middle East', ''],
  // South Asia
  ['indiapost', 'India Post', 'South Asia', ''],
  ['delhivery', 'Delhivery', 'South Asia', 'https://www.delhivery.com/track/package/{n}'],
  ['bluedart', 'Blue Dart', 'South Asia', ''],
  ['dtdc', 'DTDC', 'South Asia', ''],
  ['ecomexpress', 'Ecom Express', 'South Asia', ''],
  ['xpressbees', 'Xpressbees', 'South Asia', ''],
  ['shadowfax', 'Shadowfax', 'South Asia', ''],
  ['ekart', 'Ekart', 'South Asia', ''],
  ['pakistanpost', 'Pakistan Post', 'South Asia', ''],
  ['tcs', 'TCS', 'South Asia', 'https://www.tcsexpress.com/track/{n}'],
  ['leopards', 'Leopards Courier', 'South Asia', ''],
  ['trax', 'Trax', 'South Asia', ''],
  ['bdpost', 'Bangladesh Post', 'South Asia', ''],
  ['slpost', 'Sri Lanka Post', 'South Asia', ''],
  // East and Southeast Asia
  ['chinapost', 'China Post', 'Asia', ''],
  ['zto', 'ZTO Express', 'Asia', ''],
  ['yto', 'YTO Express', 'Asia', ''],
  ['sto', 'STO Express', 'Asia', ''],
  ['yunda', 'Yunda Express', 'Asia', ''],
  ['jd', 'JD Logistics', 'Asia', ''],
  ['japanpost', 'Japan Post', 'Asia', 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1={n}&locale=en'],
  ['yamato', 'Yamato Transport', 'Asia', ''],
  ['sagawa', 'Sagawa Express', 'Asia', ''],
  ['koreapost', 'Korea Post', 'Asia', ''],
  ['cj', 'CJ Logistics', 'Asia', ''],
  ['hanjin', 'Hanjin', 'Asia', ''],
  ['lotte', 'Lotte Global Logistics', 'Asia', ''],
  ['hkpost', 'Hongkong Post', 'Asia', ''],
  ['chunghwapost', 'Chunghwa Post', 'Asia', ''],
  ['singpost', 'SingPost', 'Asia', ''],
  ['posmalaysia', 'Pos Malaysia', 'Asia', ''],
  ['thaipost', 'Thailand Post', 'Asia', 'https://track.thailandpost.co.th/?trackNumber={n}'],
  ['kerry', 'Kerry Express', 'Asia', ''],
  ['flash', 'Flash Express', 'Asia', ''],
  ['vnpost', 'Vietnam Post', 'Asia', ''],
  ['lbc', 'LBC Express', 'Asia', ''],
  ['phlpost', 'PHLPost', 'Asia', ''],
  ['posindonesia', 'Pos Indonesia', 'Asia', ''],
  ['jne', 'JNE', 'Asia', ''],
  ['sicepat', 'SiCepat', 'Asia', ''],
  ['lex', 'Lazada Express', 'Asia', ''],
  ['spx', 'Shopee Express', 'Asia', ''],
  // Oceania
  ['auspost', 'Australia Post', 'Oceania', 'https://auspost.com.au/mypost/track/#/details/{n}'],
  ['startrack', 'StarTrack', 'Oceania', 'https://startrack.com.au/track/details/{n}'],
  ['sendle', 'Sendle', 'Oceania', 'https://track.sendle.com/tracking?ref={n}'],
  ['couriersplease', 'CouriersPlease', 'Oceania', ''],
  ['nzpost', 'NZ Post', 'Oceania', 'https://www.nzpost.co.nz/tools/tracking/item/{n}'],
  // Sub-Saharan Africa
  ['sapost', 'South African Post Office', 'Africa', ''],
  ['courierguy', 'The Courier Guy', 'Africa', ''],
  ['nipost', 'NIPOST', 'Africa', ''],
  ['gig', 'GIG Logistics', 'Africa', ''],
  ['postakenya', 'Posta Kenya', 'Africa', ''],
  // USA and Canada (more)
  ['oldominion', 'Old Dominion Freight', 'USA and Canada', ''],
  ['xpo', 'XPO', 'USA and Canada', ''],
  ['saia', 'Saia', 'USA and Canada', ''],
  ['rlcarriers', 'R+L Carriers', 'USA and Canada', ''],
  ['abf', 'ABF Freight', 'USA and Canada', ''],
  ['sefl', 'Southeastern Freight Lines', 'USA and Canada', ''],
  ['aaacooper', 'AAA Cooper', 'USA and Canada', ''],
  ['averitt', 'Averitt Express', 'USA and Canada', ''],
  ['centraltransport', 'Central Transport', 'USA and Canada', ''],
  ['daytonfreight', 'Dayton Freight', 'USA and Canada', ''],
  ['fedexfreight', 'FedEx Freight', 'USA and Canada', ''],
  ['tforce', 'TForce Freight', 'USA and Canada', ''],
  ['pilot', 'Pilot Freight Services', 'USA and Canada', ''],
  ['pittohio', 'Pitt Ohio', 'USA and Canada', ''],
  ['ward', 'Ward Trucking', 'USA and Canada', ''],
  ['bettertrucks', 'Better Trucks', 'USA and Canada', ''],
  ['cdl', 'CDL Last Mile', 'USA and Canada', ''],
  ['axlehire', 'AxleHire', 'USA and Canada', ''],
  ['jitsu', 'Jitsu', 'USA and Canada', ''],
  ['dropoff', 'Dropoff', 'USA and Canada', ''],
  ['upsmi', 'UPS Mail Innovations', 'USA and Canada', ''],
  ['fedexsmartpost', 'FedEx Ground Economy', 'USA and Canada', ''],
  ['apcpl', 'APC Postal Logistics', 'USA and Canada', ''],
  ['osm', 'OSM Worldwide', 'USA and Canada', ''],
  ['epostglobal', 'ePost Global', 'USA and Canada', ''],
  ['passport', 'Passport Shipping', 'USA and Canada', ''],
  ['landmark', 'Landmark Global', 'USA and Canada', ''],
  ['stallion', 'Stallion Express', 'USA and Canada', ''],
  ['chitchats', 'Chit Chats', 'USA and Canada', ''],
  ['dicom', 'Dicom', 'USA and Canada', ''],
  ['loomis', 'Loomis Express', 'USA and Canada', ''],
  ['ics', 'ICS Courier', 'USA and Canada', ''],
  ['nationex', 'Nationex', 'USA and Canada', ''],
  ['dayross', 'Day and Ross', 'USA and Canada', ''],
  ['flexport', 'Flexport', 'USA and Canada', ''],
  // Latin America (more)
  ['correoschile', 'Correos de Chile', 'Latin America', ''],
  ['starken', 'Starken', 'Latin America', ''],
  ['bluexpress', 'Blue Express', 'Latin America', ''],
  ['urbano', 'Urbano', 'Latin America', ''],
  ['olva', 'Olva Courier', 'Latin America', ''],
  ['serpost', 'Serpost', 'Latin America', ''],
  ['472', '4-72 Colombia', 'Latin America', ''],
  ['coordinadora', 'Coordinadora', 'Latin America', ''],
  ['envia', 'Envia', 'Latin America', ''],
  ['interrapidisimo', 'Inter Rapidisimo', 'Latin America', ''],
  ['tcc', 'TCC', 'Latin America', ''],
  ['deprisa', 'Deprisa', 'Latin America', ''],
  ['correouy', 'Correo Uruguayo', 'Latin America', ''],
  ['correocr', 'Correos de Costa Rica', 'Latin America', ''],
  ['correopy', 'Correo Paraguayo', 'Latin America', ''],
  ['totalexpress', 'Total Express', 'Latin America', ''],
  ['loggi', 'Loggi', 'Latin America', ''],
  ['azulcargo', 'Azul Cargo Express', 'Latin America', ''],
  ['sequoia', 'Sequoia Logistica', 'Latin America', ''],
  ['mercadoenvios', 'Mercado Envios', 'Latin America', ''],
  ['oca', 'OCA', 'Latin America', ''],
  ['viacargo', 'Via Cargo', 'Latin America', ''],
  ['paquetexpress', 'Paquetexpress', 'Latin America', ''],
  ['redpack', 'Redpack', 'Latin America', ''],
  ['99minutos', '99minutos', 'Latin America', ''],
  ['sendex', 'Sendex', 'Latin America', ''],
  ['castores', 'Castores', 'Latin America', ''],
  ['ipostel', 'Ipostel', 'Latin America', ''],
  ['jamaicapost', 'Jamaica Post', 'Latin America', ''],
  ['ttpost', 'TTPost', 'Latin America', ''],
  // UK and Ireland (more)
  ['dhlparceluk', 'DHL Parcel UK', 'UK and Ireland', ''],
  ['whistl', 'Whistl', 'UK and Ireland', ''],
  ['citysprint', 'CitySprint', 'UK and Ireland', ''],
  ['arrowxl', 'Arrow XL', 'UK and Ireland', ''],
  ['panther', 'Panther Logistics', 'UK and Ireland', ''],
  ['dpdie', 'DPD Ireland', 'UK and Ireland', ''],
  ['glsie', 'GLS Ireland', 'UK and Ireland', ''],
  ['fedexuk', 'FedEx UK', 'UK and Ireland', ''],
  ['ukmail', 'UK Mail', 'UK and Ireland', ''],
  // Europe (more)
  ['dhlparcelnl', 'DHL Parcel Benelux', 'Europe', ''],
  ['colisprive', 'Colis Prive', 'Europe', ''],
  ['dpdfr', 'DPD France', 'Europe', ''],
  ['dpdpl', 'DPD Poland', 'Europe', ''],
  ['dpdnl', 'DPD Netherlands', 'Europe', ''],
  ['relaiscolis', 'Relais Colis', 'Europe', ''],
  ['geodis', 'GEODIS', 'Europe', ''],
  ['glsit', 'GLS Italy', 'Europe', ''],
  ['glses', 'GLS Spain', 'Europe', ''],
  ['nexive', 'Nexive', 'Europe', ''],
  ['correosexpress', 'Correos Express', 'Europe', ''],
  ['nacex', 'Nacex', 'Europe', ''],
  ['zeleris', 'Zeleris', 'Europe', ''],
  ['envialia', 'Envialia', 'Europe', ''],
  ['tipsa', 'TIPSA', 'Europe', ''],
  ['cttexpress', 'CTT Express', 'Europe', ''],
  ['pocztex', 'Pocztex', 'Europe', ''],
  ['fan', 'FAN Courier', 'Europe', ''],
  ['cargus', 'Cargus', 'Europe', ''],
  ['sameday', 'Sameday', 'Europe', ''],
  ['postaromana', 'Posta Romana', 'Europe', ''],
  ['econt', 'Econt', 'Europe', ''],
  ['speedy', 'Speedy', 'Europe', ''],
  ['bgpost', 'Bulgarian Posts', 'Europe', ''],
  ['hrvatskaposta', 'Hrvatska Posta', 'Europe', ''],
  ['overseas', 'Overseas Express', 'Europe', ''],
  ['postaslovenije', 'Posta Slovenije', 'Europe', ''],
  ['postasrbije', 'Posta Srbije', 'Europe', ''],
  ['dexpress', 'D Express', 'Europe', ''],
  ['slovenskaposta', 'Slovenska Posta', 'Europe', ''],
  ['sps', 'SPS Slovak Parcel Service', 'Europe', ''],
  ['omniva', 'Omniva', 'Europe', ''],
  ['latvijaspasts', 'Latvijas Pasts', 'Europe', ''],
  ['lietuvospastas', 'Lietuvos Pastas', 'Europe', ''],
  ['venipak', 'Venipak', 'Europe', ''],
  ['smartpost', 'SmartPOST', 'Europe', ''],
  ['matkahuolto', 'Matkahuolto', 'Europe', ''],
  ['budbee', 'Budbee', 'Europe', ''],
  ['instabox', 'Instabox', 'Europe', ''],
  ['airmee', 'Airmee', 'Europe', ''],
  ['dao', 'DAO', 'Europe', ''],
  ['icelandpost', 'Iceland Post', 'Europe', ''],
  ['postlu', 'POST Luxembourg', 'Europe', ''],
  ['maltapost', 'MaltaPost', 'Europe', ''],
  ['cypruspost', 'Cyprus Post', 'Europe', ''],
  ['postashqiptare', 'Posta Shqiptare', 'Europe', ''],
  ['bhposta', 'BH Posta', 'Europe', ''],
  ['postamk', 'Posta na Severna Makedonija', 'Europe', ''],
  ['postacg', 'Posta Crne Gore', 'Europe', ''],
  ['moldovaposta', 'Posta Moldovei', 'Europe', ''],
  ['belpost', 'Belpost', 'Europe', ''],
  ['georgianpost', 'Georgian Post', 'Europe', ''],
  ['haypost', 'HayPost', 'Europe', ''],
  ['azerpost', 'Azerpost', 'Europe', ''],
  ['kazpost', 'Kazpost', 'Europe', ''],
  ['meest', 'Meest', 'Europe', ''],
  ['boxberry', 'Boxberry', 'Europe', ''],
  ['pickpoint', 'PickPoint', 'Europe', ''],
  ['yandexdelivery', 'Yandex Delivery', 'Europe', ''],
  ['ozon', 'Ozon Logistics', 'Europe', ''],
  ['surat', 'Surat Kargo', 'Europe', ''],
  ['hepsijet', 'HepsiJET', 'Europe', ''],
  ['sendeo', 'Sendeo', 'Europe', ''],
  ['kolaygelsin', 'Kolay Gelsin', 'Europe', ''],
  ['postat', 'Austrian Post Express', 'Europe', ''],
  // Middle East (more)
  ['salasa', 'Salasa', 'Middle East', ''],
  ['mylerz', 'Mylerz', 'Middle East', ''],
  ['r2s', 'R2S Logistics', 'Middle East', ''],
  ['libanpost', 'LibanPost', 'Middle East', ''],
  ['iranpost', 'Iran Post', 'Middle East', ''],
  ['tipax', 'Tipax', 'Middle East', ''],
  ['chapar', 'Chapar', 'Middle East', ''],
  ['hfd', 'HFD Israel', 'Middle East', ''],
  ['cheetah', 'Cheetah Israel', 'Middle East', ''],
  // South Asia (more)
  ['shiprocket', 'Shiprocket', 'South Asia', ''],
  ['gati', 'Gati', 'South Asia', ''],
  ['professional', 'The Professional Couriers', 'South Asia', ''],
  ['trackon', 'Trackon', 'South Asia', ''],
  ['spoton', 'Spoton', 'South Asia', ''],
  ['safexpress', 'Safexpress', 'South Asia', ''],
  ['rivigo', 'Rivigo', 'South Asia', ''],
  ['marutic', 'Shree Maruti Courier', 'South Asia', ''],
  ['anjani', 'Shree Anjani Courier', 'South Asia', ''],
  ['pickrr', 'Pickrr', 'South Asia', ''],
  ['nepalpost', 'Nepal Post', 'South Asia', ''],
  ['pathao', 'Pathao Courier', 'South Asia', ''],
  ['redx', 'RedX', 'South Asia', ''],
  ['sundarban', 'Sundarban Courier', 'South Asia', ''],
  ['paperfly', 'Paperfly', 'South Asia', ''],
  ['ecourier', 'eCourier', 'South Asia', ''],
  ['steadfast', 'Steadfast Courier', 'South Asia', ''],
  ['mpcourier', 'M and P Courier', 'South Asia', ''],
  ['callcourier', 'Call Courier', 'South Asia', ''],
  ['bluex', 'BlueEx', 'South Asia', ''],
  ['postex', 'PostEx', 'South Asia', ''],
  ['darazexpress', 'Daraz Express', 'South Asia', ''],
  ['domex', 'Domex', 'South Asia', ''],
  // Asia (more)
  ['best', 'Best Express', 'Asia', ''],
  ['deppon', 'Deppon', 'Asia', ''],
  ['zjs', 'ZJS Express', 'Asia', ''],
  ['jtchina', 'J&T Express China', 'Asia', ''],
  ['danniao', 'Danniao', 'Asia', ''],
  ['ubi', 'UBI Logistics', 'Asia', ''],
  ['wishpost', 'WishPost', 'Asia', ''],
  ['sunyou', 'Sunyou', 'Asia', ''],
  ['anjun', 'Anjun Logistics', 'Asia', ''],
  ['equick', 'Equick China', 'Asia', ''],
  ['cne', 'CNE Express', 'Asia', ''],
  ['seino', 'Seino Transportation', 'Asia', ''],
  ['fukuyama', 'Fukuyama Transporting', 'Asia', ''],
  ['nipponexpress', 'Nippon Express', 'Asia', ''],
  ['logen', 'Logen', 'Asia', ''],
  ['kyungdong', 'Kyungdong Express', 'Asia', ''],
  ['daesin', 'Daesin Logistics', 'Asia', ''],
  ['tcat', 'T-Cat Taiwan', 'Asia', ''],
  ['hct', 'HCT Logistics', 'Asia', ''],
  ['macaupost', 'Macau Post', 'Asia', ''],
  ['mongolpost', 'Mongol Post', 'Asia', ''],
  ['qxpress', 'Qxpress', 'Asia', ''],
  ['janio', 'Janio', 'Asia', ''],
  ['gdex', 'GDEX', 'Asia', ''],
  ['citylink', 'City-Link Express', 'Asia', ''],
  ['skynet', 'Skynet Express', 'Asia', ''],
  ['abx', 'ABX Express', 'Asia', ''],
  ['lineclear', 'Line Clear Express', 'Asia', ''],
  ['bestth', 'Best Express Thailand', 'Asia', ''],
  ['scgexpress', 'SCG Express', 'Asia', ''],
  ['nim', 'Nim Express', 'Asia', ''],
  ['viettelpost', 'Viettel Post', 'Asia', ''],
  ['ghn', 'Giao Hang Nhanh', 'Asia', ''],
  ['ghtk', 'Giao Hang Tiet Kiem', 'Asia', ''],
  ['ahamove', 'Ahamove', 'Asia', ''],
  ['2go', '2GO Express', 'Asia', ''],
  ['jrs', 'JRS Express', 'Asia', ''],
  ['entrego', 'Entrego', 'Asia', ''],
  ['xde', 'XDE Logistics', 'Asia', ''],
  ['tiki', 'TIKI', 'Asia', ''],
  ['anteraja', 'AnterAja', 'Asia', ''],
  ['lionparcel', 'Lion Parcel', 'Asia', ''],
  ['wahana', 'Wahana', 'Asia', ''],
  ['idexpress', 'ID Express', 'Asia', ''],
  ['sapexpress', 'SAP Express', 'Asia', ''],
  ['paxel', 'Paxel', 'Asia', ''],
  ['rpx', 'RPX', 'Asia', ''],
  ['cambodiapost', 'Cambodia Post', 'Asia', ''],
  // Oceania (more)
  ['toll', 'Toll', 'Oceania', ''],
  ['teamglobal', 'Team Global Express', 'Oceania', ''],
  ['hunter', 'Hunter Express', 'Oceania', ''],
  ['allied', 'Allied Express', 'Oceania', ''],
  ['directfreight', 'Direct Freight Express', 'Oceania', ''],
  ['borderexpress', 'Border Express', 'Oceania', ''],
  ['aramexnz', 'Aramex New Zealand', 'Oceania', ''],
  ['pbt', 'PBT Couriers', 'Oceania', ''],
  ['castle', 'Castle Parcels', 'Oceania', ''],
  ['posthaste', 'Post Haste', 'Oceania', ''],
  ['nzcouriers', 'NZ Couriers', 'Oceania', ''],
  ['mainfreight', 'Mainfreight', 'Oceania', ''],
  ['fijipost', 'Fiji Post', 'Oceania', ''],
  // Africa (more)
  ['aramexza', 'Aramex South Africa', 'Africa', ''],
  ['ram', 'RAM Hand-to-Hand Couriers', 'Africa', ''],
  ['dawnwing', 'Dawn Wing', 'Africa', ''],
  ['courierit', 'Courier IT', 'Africa', ''],
  ['postnet', 'PostNet', 'Africa', ''],
  ['pargo', 'Pargo', 'Africa', ''],
  ['paxi', 'PAXI', 'Africa', ''],
  ['g4s', 'G4S Courier', 'Africa', ''],
  ['wellsfargoke', 'Wells Fargo Kenya', 'Africa', ''],
  ['sendy', 'Sendy', 'Africa', ''],
  ['fargo', 'Fargo Courier', 'Africa', ''],
  ['redstar', 'Red Star Express', 'Africa', ''],
  ['sendbox', 'Sendbox', 'Africa', ''],
  ['ghanapost', 'Ghana Post', 'Africa', ''],
  ['amana', 'Amana', 'Africa', ''],
  ['ctm', 'CTM Messagerie', 'Africa', ''],
  ['yalidine', 'Yalidine', 'Africa', ''],
  ['mauritiuspost', 'Mauritius Post', 'Africa', ''],
  ['ethiopost', 'Ethiopian Postal Service', 'Africa', ''],
  ['tzpost', 'Tanzania Posts Corporation', 'Africa', ''],
  ['ugandapost', 'Uganda Post', 'Africa', ''],
  ['zimpost', 'Zimpost', 'Africa', ''],
  ['botswanapost', 'BotswanaPost', 'Africa', ''],
  ['nampost', 'NamPost', 'Africa', ''],
  ['campost', 'Campost', 'Africa', ''],
  // Freight and ocean (more)
  ['kuehnenagel', 'Kuehne and Nagel', 'Freight and ocean', ''],
  ['dbschenker', 'DB Schenker', 'Freight and ocean', ''],
  ['dsv', 'DSV', 'Freight and ocean', ''],
  ['expeditors', 'Expeditors', 'Freight and ocean', ''],
  ['ceva', 'CEVA Logistics', 'Freight and ocean', ''],
  ['dachser', 'Dachser', 'Freight and ocean', ''],
  ['rhenus', 'Rhenus Logistics', 'Freight and ocean', ''],
  ['hellmann', 'Hellmann Worldwide', 'Freight and ocean', ''],
  ['maersk', 'Maersk', 'Freight and ocean', ''],
  ['msc', 'MSC', 'Freight and ocean', ''],
  ['cmacgm', 'CMA CGM', 'Freight and ocean', ''],
  ['hapag', 'Hapag-Lloyd', 'Freight and ocean', ''],
  ['evergreen', 'Evergreen Line', 'Freight and ocean', ''],
  ['cosco', 'COSCO Shipping', 'Freight and ocean', ''],
  ['one', 'Ocean Network Express', 'Freight and ocean', ''],
  ['zim', 'ZIM', 'Freight and ocean', ''],
  ['yangming', 'Yang Ming', 'Freight and ocean', ''],
  ['hmm', 'HMM', 'Freight and ocean', ''],
  ['pil', 'Pacific International Lines', 'Freight and ocean', ''],
]
const CARRIERS = {}
for (const [id, name, region, url] of LIST) CARRIERS[id] = { name, region, url: n => (url || T17).replace('{n}', n) }
CARRIERS.other = { name: 'Any carrier (17track)', region: 'Other', url: n => T17.replace('{n}', n) }
// the international mail format RR123456789XX ends in the country of the post office that sent it
const UPU = { US: 'usps', GB: 'royalmail', CA: 'canadapost', SA: 'saudipost', CN: 'chinapost', AU: 'auspost', DE: 'deutschepost', FR: 'laposte', NL: 'postnl', JP: 'japanpost', IN: 'indiapost', AE: 'emiratespost', PK: 'pakistanpost', TR: 'ptt', IT: 'posteitaliane', ES: 'correos', BE: 'bpost', CH: 'swisspost', AT: 'austrianpost', SE: 'postnord', DK: 'postnord', NO: 'bring', FI: 'posti', PL: 'pocztapolska', RU: 'russianpost', UA: 'ukrposhta', BR: 'correiosbr', MX: 'correosmx', AR: 'correoar', KR: 'koreapost', HK: 'hkpost', SG: 'singpost', MY: 'posmalaysia', TH: 'thaipost', VN: 'vnpost', PH: 'phlpost', ID: 'posindonesia', NZ: 'nzpost', ZA: 'sapost', EG: 'egyptpost', QA: 'qatarpost', KW: 'kuwaitpost', OM: 'omanpost', BH: 'bahrainpost', JO: 'jordanpost', IL: 'israelpost', IE: 'anpost', PT: 'ctt', GR: 'elta', CZ: 'ceskaposta', HU: 'magyarposta', TW: 'chunghwapost', LK: 'slpost', BD: 'bdpost', NG: 'nipost', KE: 'postakenya', MA: 'baridmaghrib', DZ: 'algerieposte', TN: 'tunisiepost', AL: 'postashqiptare', IS: 'icelandpost', LU: 'postlu', MT: 'maltapost', CY: 'cypruspost', GE: 'georgianpost', AM: 'haypost', AZ: 'azerpost', KZ: 'kazpost', BY: 'belpost', MD: 'moldovaposta', ME: 'postacg', MK: 'postamk', BA: 'bhposta', EE: 'omniva', LV: 'latvijaspasts', LT: 'lietuvospastas', SI: 'postaslovenije', SK: 'slovenskaposta', HR: 'hrvatskaposta', RS: 'postasrbije', RO: 'postaromana', BG: 'bgpost', JM: 'jamaicapost', TT: 'ttpost', VE: 'ipostel', PE: 'serpost', CL: 'correoschile', UY: 'correouy', PY: 'correopy', CR: 'correocr', LB: 'libanpost', IR: 'iranpost', NP: 'nepalpost', KH: 'cambodiapost', MN: 'mongolpost', MO: 'macaupost', FJ: 'fijipost', GH: 'ghanapost', ET: 'ethiopost', TZ: 'tzpost', UG: 'ugandapost', ZW: 'zimpost', BW: 'botswanapost', NA: 'nampost', MU: 'mauritiuspost', CM: 'campost', CO: '472' }
// formats that belong to one carrier; plain digit numbers are a best guess you can change
const PATTERNS = [
  [/^1Z[0-9A-Z]{16}$/, 'ups'], [/^TB[ACM]\d{12}$/, 'amazon'], [/^9[1-5]\d{18,20}$/, 'usps'],
  [/^(JJD\d{10,}|JVGL\d{10,}|GM\d{16,}|LX\d{9}DE)$/, 'dhl'], [/^SF\d{12,13}$/, 'sfexpress'], [/^(LP|CNG|CAINIAO)\d{8,}/, 'cainiao'],
  [/^YT\d{16}$/, 'yunexpress'], [/^(C11|C10|C99)\d{14}$/, 'ontrac'], [/^1LS\d{12,}$/, 'lasership'], [/^H[0-9A-Z]{15}$/, 'evri'],
  [/^JD\d{16}$/, 'yodel'], [/^\d{14}$/, 'dpd'], [/^\d{20}$/, 'fedex'], [/^\d{22}$/, 'fedex'], [/^\d{15}$/, 'fedex'],
  [/^(\d{10}|[A-Z]{3}\d{7})$/, 'dhl'], [/^\d{12}$/, 'fedex'], [/^\d{11}$/, 'aramex'], [/^\d{16}$/, 'canadapost'],
]
function detect(n) {
  n = clean(n)
  const s10 = n.match(/^[A-Z]{2}\d{9}([A-Z]{2})$/); if (s10 && UPU[s10[1]]) return UPU[s10[1]]
  for (const [re, id] of PATTERNS) if (re.test(n)) return id
  return 'other'
}
const looksLikeTracking = s => { const n = clean(s); return n.length >= 9 && n.length <= 34 && /\d{6,}/.test(n) && /^[A-Z0-9]+$/.test(n) && (detect(n) !== 'other' || /^[A-Z]{2,4}\d{8,}[A-Z]{0,2}$/.test(n)) }

const trackURL = p => (CARRIERS[p.carrier] || CARRIERS.other).url(encodeURIComponent(p.number))
const carrierName = k => (CARRIERS[k] || CARRIERS.other).name

// ------------------------------------------------------------ status from page text
// "Estimated delivery: Friday, November 28" -> "Friday, November 28"; "Arriving tomorrow" -> "tomorrow"
function etaOf(text) {
  const t = String(text || '').slice(0, 20000)
  const m = t.match(/(?:estimated|expected|scheduled|arriving|arrives|delivery by|deliver(?:ed|y) (?:on|by))[^\n:]{0,20}[:\s]+((?:today|tomorrow)|(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s*(?:[a-z]{3,9}\.?\s+\d{1,2}|\d{1,2}\s+[a-z]{3,9}\.?)?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i)
  return m ? m[1].trim().replace(/\s+/g, ' ').replace(/^./, c => c.toUpperCase()) : ''
}
// newest wording wins: a page that says "Delivered" anywhere near the top is delivered
function statusOf(text) {
  const t = String(text || '').slice(0, 20000)
  const notYet = /(estimated|expected|scheduled|arriving|will be|to be|attempted|failed|out for|not yet|by \w+day)\s+deliver/i
  if (/(has been|was|been|successfully|package|parcel|item|shipment|order)\s+delivered\b/i.test(t) || /(^|\n)\s*delivered\b/i.test(t) || /status\s*[:\-]?\s*delivered\b/i.test(t) || /تم التوصيل|تم التسليم/.test(t)) {
    // "Delivered" that is really "estimated delivery" does not count
    const m = t.match(/(^|\n)\s*delivered\b[^\n]{0,60}/i)
    if (!m || !notYet.test(m[0])) return { status: 'delivered', text: 'Delivered' }
  }
  if (/out for delivery|with (the )?courier for delivery|قيد التوصيل|خرجت للتوصيل/i.test(t)) return { status: 'out', text: 'Out for delivery' }
  if (/in transit|on (its|the) way|departed|arrived at|shipped|dispatched|في الطريق|تم الشحن/i.test(t)) return { status: 'transit', text: 'On the way' }
  if (/label created|order (placed|confirmed|received)|processing|preparing/i.test(t)) return { status: 'placed', text: 'Order placed' }
  return null
}

// ------------------------------------------------------------ order pages
// runs inside the page; returns what it found, or null when this is not an order page
const ORDER_SCAN = `(() => {
  const url = location.href, text = (document.body && document.body.innerText || '').slice(0, 30000)
  const urlHit = /(order[-_ ]?(confirm\\w*|complete\\w*|success|received|details?|placed|status|summary)|thank[-_ ]?you|checkout\\/(success|complete|thank\\w*)|purchase\\/(complete|success)|\\/orders?\\/[\\w-]{5,}|order-?id=|orderid=)/i.test(url)
  const textHit = /(thank(s| you) for (your )?(order|purchase|shopping)|your order (has been |is )?(placed|confirmed|received)|order (has been )?(placed|confirmed)|order (number|no\\.?|#|id)\\s*[:#]?\\s*[A-Z0-9-]{5,}|تم تأكيد طلبك|رقم الطلب|شكرا لطلبك)/i.test(text)
  if (!textHit || (!urlHit && !/thank(s| you) for (your )?(order|purchase)/i.test(text))) return null
  const om = text.match(/(?:order|طلب)\\s*(?:number|no\\.?|#|id|رقم)?\\s*[:#]?\\s*#?\\s*([A-Z0-9][A-Z0-9-]{4,30})/i)
  // tracking numbers: strong patterns anywhere, plain digits only right after the word tracking
  const tr = new Set()
  for (const m of text.matchAll(/\\b(1Z[0-9A-Z]{16}|TB[ACM]\\d{12}|[A-Z]{2}\\d{9}[A-Z]{2})\\b/g)) tr.add(m[1])
  for (const m of text.matchAll(/(?:tracking|track|airway ?bill|awb|رقم التتبع|رقم الشحنة)[^\\n\\d]{0,30}(\\d{10,22})/gi)) tr.add(m[1])
  return { url, title: document.title, orderNo: om ? om[1] : '', tracking: [...tr].slice(0, 3), text: text.slice(0, 6000) }
})()`

function list() { return store.get() }
function active() { return store.get().filter(p => p.status !== 'delivered') }
function add({ number = '', name = '', carrier = '', url = '', shop = '', orderNo = '', source = 'manual' } = {}) {
  number = clean(number)
  if (!number && !url) return null
  const all = store.get()
  const same = all.find(p => (number && p.number === number) || (orderNo && p.orderNo === orderNo && p.shop === shop) || (!number && url && p.url === url))
  if (same) {   // the same order seen again: fill in what we learned (a tracking number, a better name)
    if (number && !same.number) { same.number = number; same.carrier = carrier || detect(number) }
    if (url && !same.url) same.url = url
    if (name && (!same.name || same.source === 'auto')) same.name = name
    store.save(); return same
  }
  const p = { id: uid(), number, carrier: number ? (CARRIERS[carrier] ? carrier : detect(number)) : '', name: String(name || '').slice(0, 80), url, shop, orderNo, status: 'placed', statusText: number ? 'Waiting for news' : 'Order placed', added: Date.now(), checked: 0, delivered: 0, source }
  store.replace([p, ...all].slice(0, 200))
  return p
}
function update(id, patch) { const p = store.get().find(x => x.id === id); if (p) { Object.assign(p, patch); store.save() } return p }
function remove(id) { store.replace(store.get().filter(p => p.id !== id)) }
function setStatus(p, st, text) {
  if (!st) return false
  if (text) { const e = etaOf(text); if (e) p.eta = e }
  const changed = st.status !== p.status
  p.status = st.status; p.statusText = st.text; p.checked = Date.now()
  if (st.status === 'delivered' && !p.delivered) p.delivered = Date.now()
  store.save(); return changed
}
// delivered parcels leave the list after three days
function prune() { const cut = Date.now() - 3 * 864e5; const keep = store.get().filter(p => p.status !== 'delivered' || p.delivered > cut); if (keep.length !== store.get().length) store.replace(keep) }
// the page that best answers "where is my order": the shop's order page, or the carrier's tracking page
// "amazon.sa" -> "Amazon", "shop.example.co.uk" -> "Example", "127.0.0.1" -> "127.0.0.1"
function shopName(host) {
  host = String(host || '').replace(/^www\./, '').replace(/:\d+$/, '')
  if (!host || /^[\d.]+$/.test(host) || host === 'localhost') return host || 'a shop'
  const parts = host.split('.')
  let i = parts.length - 2
  if (i > 0 && /^(co|com|org|net|gov|ac|edu)$/.test(parts[i]) && parts[i + 1].length === 2) i--
  const n = parts[Math.max(0, i)]
  return n.charAt(0).toUpperCase() + n.slice(1)
}
const openURL = p => p.url || (p.number ? trackURL(p) : '')

module.exports = { etaOf, shopName, store, LIST, looksLikeTracking, CARRIERS, detect, trackURL, carrierName, statusOf, ORDER_SCAN, list, active, add, update, remove, setStatus, prune, openURL, clean }
