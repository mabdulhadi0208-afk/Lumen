'use strict';
// Drop 1.6.0: src/carriers.js, src/stores.js, src/prices.js, src/orders.js for the browser (built by scripts/web/build.js)
(function () {
  const M = {};
  const req = (n) => M[n.replace(/^\.\//, '').replace(/\.js$/, '')];
  (function () {
    const module = { exports: {} }, exports = module.exports, require = req;
'use strict'
// Carriers, tracking numbers and tracking links. Ported from Lumen's Parcels (src/parcels.js), which reads the
// number and carrier out of whatever you paste or whatever a shop page links to. Pure: no Electron, no storage.
const clean = n => String(n || '').toUpperCase().replace(/[\s-]/g, '')
// ------------------------------------------------------------ carriers
// [id, name, region, tracking page ({n} = the number)]. With no page listed, Drop goes straight to that carrier's own
// tracking site: the first result for "<carrier> tracking <number>". 17track is only for Any carrier.
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
const ownSite = (name, n) => 'https://duckduckgo.com/?q=' + encodeURIComponent('!ducky ' + name + ' tracking ' + decodeURIComponent(n))
for (const [id, name, region, url] of LIST) CARRIERS[id] = { name, region, direct: !!url, url: n => url ? url.replace('{n}', n) : ownSite(name, n) }
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
// ------------------------------------------------------------ tracking links
// every carrier link above, turned around: "https://www.ups.com/track?tracknum=1Z..." -> UPS, 1Z...
// (the number sits in a query value or in the path, where the {n} was). Shop pages link to these.
const BASE = h => { const p = String(h || '').toLowerCase().replace(/^www\./, '').split('.'); return p.slice(p.length > 2 && /^(co|com|org|net|gov|ac|edu)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2 ? -3 : -2).join('.') }
const LINKS = []
for (const [id, , , url] of LIST) {
  if (!url || !url.includes('{n}')) continue
  try {
    const u = new URL(url.replace('{n}', 'NUMBER0')), q = [...u.searchParams].find(([, v]) => v === 'NUMBER0')
    LINKS.push({ id, base: BASE(u.hostname), param: q ? q[0].toLowerCase() : '', path: q ? '' : u.pathname.split('NUMBER0')[0] })
  } catch {}
}
// the names shops (and Shopify) use for the number in a tracking link, whoever the carrier is
const PARAMS = ['tracknum', 'tracknumbers', 'tlabels', 'trknbr', 'tracking-id', 'trackingnumber', 'tracking_number', 'trackingnumbers', 'tracking', 'trackingid', 'tracking_id', 'trackno', 'track', 'awb', 'shipmentnumber', 'consignment', 'cons', 'barcode', 'parcelnumber', 'parcel', 'number', 'id', 'nums']
function fromLink(href) {
  let u; try { u = new URL(href) } catch { return null }
  if (!/^https?:$/.test(u.protocol)) return null
  const base = BASE(u.hostname), mine = LINKS.filter(l => l.base === base)
  const q = {}; for (const [k, v] of u.searchParams) q[k.toLowerCase()] = v
  const ok = v => { const n = clean(String(v || '').split(/[,\s]/)[0]); return n.length >= 8 && n.length <= 34 && /\d{5,}/.test(n) && /^[A-Z0-9]+$/.test(n) ? n : '' }
  for (const l of mine) {
    const n = l.param ? ok(q[l.param]) : u.pathname.startsWith(l.path) ? ok(decodeURIComponent(u.pathname.slice(l.path.length).split('/')[0])) : ''
    if (n) return { number: n, carrier: l.id }
  }
  // a carrier we know by its site, but with a link shape we have not seen; or any page with a tracking-ish value
  const known = mine.length ? mine[0].id : ''
  for (const k of PARAMS) { const n = ok(q[k]); if (n && /track|parcel|ship|deliver|post|courier|17track|aftership|narvar|route/i.test(u.hostname + u.pathname)) return { number: n, carrier: known || detect(n) } }
  return null
}


// what you pasted, typed or right-clicked: a tracking number, or a carrier's tracking link -> { number, carrier, link }
function parse(s) {
  s = String(s || '').trim()
  if (/^https?:\/\//i.test(s) && s.length < 2000) { const f = fromLink(s); return f ? { ...f, link: s } : null }
  return s.length < 40 && looksLikeTracking(s) ? { number: clean(s), carrier: detect(s), link: '' } : null
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

// ------------------------------------------------------------ the timeline
// Every carrier says it differently; Drop shows the same four steps for all of them.
const STEPS = [
  ['placed', 'Ordered'],
  ['transit', 'Shipped'],
  ['out', 'Out for delivery'],
  ['delivered', 'Delivered'],
]
const stepIndex = s => Math.max(0, STEPS.findIndex(x => x[0] === s))
// schema.org order and delivery states -> Drop's steps
function schemaStatus(v) {
  const s = String(v || '').replace(/^https?:\/\/schema\.org\//i, '').toLowerCase()
  if (!s) return null
  if (/delivered|pickupavailable/.test(s)) return { status: 'delivered', text: 'Delivered' }
  if (/outfordelivery/.test(s)) return { status: 'out', text: 'Out for delivery' }
  if (/intransit|shipped|dispatched/.test(s)) return { status: 'transit', text: 'On the way' }
  if (/problem|returned|cancel/.test(s)) return { status: 'placed', text: s.includes('cancel') ? 'Cancelled' : 'Needs attention' }
  if (/processing|paymentdue|placed|pending/.test(s)) return { status: 'placed', text: 'Order placed' }
  return null
}
// is this host one of the carriers' own tracking sites? (then the page is about a parcel, not an order)
function carrierOfHost(host) {
  const b = BASE(host)
  const l = LINKS.find(x => x.base === b)
  return l ? l.id : ''
}
// a shop name from its host: "amazon.co.uk" -> "Amazon", "shop.example.com" -> "Example"
function shopName(host) {
  host = String(host || '').replace(/^www\./, '').replace(/:\d+$/, '')
  if (!host || /^[\d.]+$/.test(host) || host === 'localhost') return host || 'a store'
  const parts = host.split('.')
  let i = parts.length - 2
  if (i > 0 && /^(co|com|org|net|gov|ac|edu)$/.test(parts[i]) && parts[i + 1].length === 2) i--
  const n = parts[Math.max(0, i)]
  return n.charAt(0).toUpperCase() + n.slice(1)
}

module.exports = { parse, fromLink, etaOf, statusOf, schemaStatus, looksLikeTracking, detect, trackURL, carrierName, carrierOfHost, shopName, clean, CARRIERS, LIST, STEPS, stepIndex, UPU }

    M['carriers'] = module.exports;
  })();
  (function () {
    const module = { exports: {} }, exports = module.exports, require = req;
'use strict';
// The store directory: real online stores around the world, as plain data.
// One line per store:  Name | domain | category | countries (ISO codes, WW = ships worldwide) | search | flags
// flags (optional): sh = the store runs on Shopify (its public /products.json works; exposed as shopify: true).
// search: a path with {q} for the store's own search page, S for the standard /search?q={q} (Shopify stores and
// many others), or empty: then Drop searches that store through a web search limited to its site.
// Logos: every store has its logo bundled in src/ui/logos/<host>.webp (scripts/logos/), served before any runtime fetch.
// The first block is hand-made; the stores after "Kikki.K" (1.2) come from Wikidata (retail chains, online shops,
// retailers, fashion labels and the like with an official website), each checked live: it answers, is not parked,
// and shows a cart or runs on a store platform. scripts/stores/ has the tools to grow the list.

const CATEGORIES = [
  ['market', 'Marketplaces'], ['dept', 'Department stores'], ['fashion', 'Fashion'], ['shoes', 'Shoes'],
  ['sport', 'Sports and outdoors'], ['beauty', 'Beauty'], ['tech', 'Electronics'], ['home', 'Home and furniture'],
  ['diy', 'DIY and garden'], ['grocery', 'Grocery'], ['kids', 'Kids and toys'], ['books', 'Books and media'],
  ['games', 'Games'], ['pets', 'Pets'], ['health', 'Health and pharmacy'], ['jewelry', 'Jewelry and watches'],
  ['luxury', 'Luxury'], ['office', 'Office and crafts'], ['auto', 'Auto and bike'], ['indie', 'Independent brands'],
];
const COUNTRIES = {
  WW: 'Worldwide', US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  GB: 'United Kingdom', IE: 'Ireland', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy', NL: 'Netherlands', BE: 'Belgium',
  AT: 'Austria', CH: 'Switzerland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czechia',
  PT: 'Portugal', GR: 'Greece', TR: 'Turkey', RO: 'Romania', AE: 'United Arab Emirates', SA: 'Saudi Arabia', EG: 'Egypt',
  IL: 'Israel', IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', CN: 'China', JP: 'Japan', KR: 'South Korea', TW: 'Taiwan',
  HK: 'Hong Kong', SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines',
  AU: 'Australia', NZ: 'New Zealand', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', MA: 'Morocco',
  AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BO: 'Bolivia', CY: 'Cyprus', EC: 'Ecuador', EE: 'Estonia', GE: 'Georgia', GL: 'Greenland', HR: 'Croatia', IS: 'Iceland', KY: 'Cayman Islands', KZ: 'Kazakhstan', LK: 'Sri Lanka', LT: 'Lithuania', LV: 'Latvia', MD: 'Moldova', OM: 'Oman', PE: 'Peru', RS: 'Serbia', RU: 'Russia', SI: 'Slovenia', SK: 'Slovakia', UA: 'Ukraine', UY: 'Uruguay', UZ: 'Uzbekistan',
};

const DATA = `
Amazon|amazon.com|market|US,WW|/s?k={q}
Amazon UK|amazon.co.uk|market|GB|/s?k={q}
Amazon Germany|amazon.de|market|DE,AT|/s?k={q}
Amazon France|amazon.fr|market|FR,BE|/s?k={q}
Amazon Italy|amazon.it|market|IT|/s?k={q}
Amazon Spain|amazon.es|market|ES|/s?k={q}
Amazon Canada|amazon.ca|market|CA|/s?k={q}
Amazon Japan|amazon.co.jp|market|JP|/s?k={q}
Amazon India|amazon.in|market|IN|/s?k={q}
Amazon Australia|amazon.com.au|market|AU|/s?k={q}
Amazon Mexico|amazon.com.mx|market|MX|/s?k={q}
Amazon Brazil|amazon.com.br|market|BR|/s?k={q}
Amazon Netherlands|amazon.nl|market|NL|/s?k={q}
Amazon Sweden|amazon.se|market|SE|/s?k={q}
Amazon Poland|amazon.pl|market|PL|/s?k={q}
Amazon Turkey|amazon.com.tr|market|TR|/s?k={q}
Amazon UAE|amazon.ae|market|AE|/s?k={q}
Amazon Saudi Arabia|amazon.sa|market|SA|/s?k={q}
Amazon Egypt|amazon.eg|market|EG|/s?k={q}
Amazon Singapore|amazon.sg|market|SG|/s?k={q}
eBay|ebay.com|market|US,WW|/sch/i.html?_nkw={q}
eBay UK|ebay.co.uk|market|GB|/sch/i.html?_nkw={q}
eBay Germany|ebay.de|market|DE|/sch/i.html?_nkw={q}
eBay Australia|ebay.com.au|market|AU|/sch/i.html?_nkw={q}
eBay Canada|ebay.ca|market|CA|/sch/i.html?_nkw={q}
eBay France|ebay.fr|market|FR|/sch/i.html?_nkw={q}
eBay Italy|ebay.it|market|IT|/sch/i.html?_nkw={q}
Etsy|etsy.com|market|WW|/search?q={q}
AliExpress|aliexpress.com|market|WW|/w/wholesale-{q}.html
Temu|temu.com|market|WW|/search_result.html?search_key={q}
Alibaba|alibaba.com|market|WW|/trade/search?SearchText={q}
Walmart|walmart.com|market|US|/search?q={q}
Walmart Canada|walmart.ca|market|CA|/search?q={q}
Walmart Mexico|walmart.com.mx|market|MX|
Mercado Libre Argentina|mercadolibre.com.ar|market|AR|
Mercado Libre Mexico|mercadolibre.com.mx|market|MX|
Mercado Livre Brazil|mercadolivre.com.br|market|BR|
Mercado Libre Chile|mercadolibre.cl|market|CL|
Mercado Libre Colombia|mercadolibre.com.co|market|CO|
Rakuten|rakuten.co.jp|market|JP|
Rakuten France|fr.shopping.rakuten.com|market|FR|
Flipkart|flipkart.com|market|IN|/search?q={q}
Meesho|meesho.com|market|IN|
Myntra|myntra.com|fashion|IN|
Nykaa|nykaa.com|beauty|IN|
Snapdeal|snapdeal.com|market|IN|/search?keyword={q}
Tata CLiQ|tatacliq.com|dept|IN|
Ajio|ajio.com|fashion|IN|
JioMart|jiomart.com|grocery|IN|
BigBasket|bigbasket.com|grocery|IN|
Croma|croma.com|tech|IN|
Reliance Digital|reliancedigital.in|tech|IN|
Daraz Pakistan|daraz.pk|market|PK|
Daraz Bangladesh|daraz.com.bd|market|BD|
Shopee Singapore|shopee.sg|market|SG|/search?keyword={q}
Shopee Malaysia|shopee.com.my|market|MY|/search?keyword={q}
Shopee Indonesia|shopee.co.id|market|ID|/search?keyword={q}
Shopee Thailand|shopee.co.th|market|TH|/search?keyword={q}
Shopee Vietnam|shopee.vn|market|VN|/search?keyword={q}
Shopee Philippines|shopee.ph|market|PH|/search?keyword={q}
Shopee Taiwan|shopee.tw|market|TW|/search?keyword={q}
Shopee Brazil|shopee.com.br|market|BR|/search?keyword={q}
Lazada Singapore|lazada.sg|market|SG|/catalog/?q={q}
Lazada Malaysia|lazada.com.my|market|MY|/catalog/?q={q}
Lazada Philippines|lazada.com.ph|market|PH|/catalog/?q={q}
Lazada Thailand|lazada.co.th|market|TH|/catalog/?q={q}
Lazada Vietnam|lazada.vn|market|VN|/catalog/?q={q}
Lazada Indonesia|lazada.co.id|market|ID|/catalog/?q={q}
Tokopedia|tokopedia.com|market|ID|/search?q={q}
Blibli|blibli.com|market|ID|
Tiki|tiki.vn|market|VN|
Coupang|coupang.com|market|KR|
Gmarket|gmarket.co.kr|market|KR|
11st|11st.co.kr|market|KR|
Musinsa|musinsa.com|fashion|KR|
Olive Young|global.oliveyoung.com|beauty|KR,WW|
Yahoo Shopping Japan|shopping.yahoo.co.jp|market|JP|
Mercari|jp.mercari.com|market|JP|
Mercari US|mercari.com|market|US|
ZOZOTOWN|zozo.jp|fashion|JP|
Yodobashi|yodobashi.com|tech|JP|
Bic Camera|biccamera.com|tech|JP|
Muji|muji.com|home|JP,WW|
Uniqlo|uniqlo.com|fashion|WW|
Taobao|taobao.com|market|CN|
Tmall|tmall.com|market|CN|
JD.com|jd.com|market|CN|
Pinduoduo|pinduoduo.com|market|CN|
JD Global|joybuy.com|market|WW|
PChome|24h.pchome.com.tw|market|TW|
momo|momoshop.com.tw|market|TW|
HKTVmall|hktvmall.com|market|HK|
Noon|noon.com|market|AE,SA,EG|
Namshi|namshi.com|fashion|AE,SA|
Jarir|jarir.com|tech|SA|
Extra|extra.com|tech|SA|
Sharaf DG|uae.sharafdg.com|tech|AE|
Carrefour UAE|carrefouruae.com|grocery|AE|
Trendyol|trendyol.com|market|TR,WW|
Hepsiburada|hepsiburada.com|market|TR|
n11|n11.com|market|TR|
Jumia Nigeria|jumia.com.ng|market|NG|
Jumia Kenya|jumia.co.ke|market|KE|
Jumia Egypt|jumia.com.eg|market|EG|
Jumia Morocco|jumia.ma|market|MA|
Takealot|takealot.com|market|ZA|
Makro South Africa|makro.co.za|dept|ZA|
Superbalist|superbalist.com|fashion|ZA|
Allegro|allegro.pl|market|PL|/listing?string={q}
Ceneo|ceneo.pl|market|PL|
Empik|empik.com|books|PL|
Bol|bol.com|market|NL,BE|/nl/nl/s/?searchtext={q}
Coolblue|coolblue.nl|tech|NL,BE|
Otto|otto.de|dept|DE|/suche/{q}/
Kaufland|kaufland.de|market|DE|
Cdiscount|cdiscount.com|market|FR|
Fnac|fnac.com|tech|FR|
Darty|darty.com|tech|FR|
Leboncoin|leboncoin.fr|market|FR|
Vinted|vinted.com|fashion|WW|
Zalando|zalando.com|fashion|DE,FR,IT,ES,NL,BE,AT,CH,PL,SE,DK,FI,NO,IE,CZ|
Zalando Germany|zalando.de|fashion|DE|
Zalando UK|zalando.co.uk|fashion|GB|
About You|aboutyou.com|fashion|DE,AT,NL,BE,PL,CZ|
El Corte Ingles|elcorteingles.es|dept|ES|
PcComponentes|pccomponentes.com|tech|ES|
Wallapop|es.wallapop.com|market|ES|
Unieuro|unieuro.it|tech|IT|
ePRICE|eprice.it|tech|IT|
Galaxus|galaxus.ch|market|CH,DE,AT|
Digitec|digitec.ch|tech|CH|
CDON|cdon.se|market|SE,NO,DK,FI|
Elgiganten|elgiganten.se|tech|SE|
Komplett|komplett.no|tech|NO,SE,DK|
Verkkokauppa|verkkokauppa.com|tech|FI|
Alza|alza.cz|tech|CZ|
eMAG|emag.ro|market|RO|
Skroutz|skroutz.gr|market|GR|
Worten|worten.pt|tech|PT|
Target|target.com|dept|US|/s?searchTerm={q}
Costco|costco.com|dept|US|/CatalogSearch?keyword={q}
Costco Canada|costco.ca|dept|CA|/CatalogSearch?keyword={q}
Costco UK|costco.co.uk|dept|GB|
Sam's Club|samsclub.com|dept|US|/s/{q}
BJ's|bjs.com|dept|US|
Kohl's|kohls.com|dept|US|/search.jsp?search={q}
Macy's|macys.com|dept|US|/shop/featured/{q}
Nordstrom|nordstrom.com|dept|US,CA|/sr?keyword={q}
Nordstrom Rack|nordstromrack.com|dept|US|/sr?keyword={q}
Bloomingdale's|bloomingdales.com|dept|US|/shop/featured/{q}
Saks Fifth Avenue|saksfifthavenue.com|luxury|US|
Neiman Marcus|neimanmarcus.com|luxury|US|
JCPenney|jcpenney.com|dept|US|/s/{q}
Dillard's|dillards.com|dept|US|
Belk|belk.com|dept|US|
TJ Maxx|tjmaxx.tjx.com|dept|US|
Marshalls|marshalls.com|dept|US|
Ross|rossstores.com|dept|US|
Burlington|burlington.com|dept|US|
QVC|qvc.com|dept|US|
HSN|hsn.com|dept|US|
Kmart Australia|kmart.com.au|dept|AU|
Target Australia|target.com.au|dept|AU|
Big W|bigw.com.au|dept|AU|
Myer|myer.com.au|dept|AU|
David Jones|davidjones.com|dept|AU|
The Warehouse|thewarehouse.co.nz|dept|NZ|
Hudson's Bay|thebay.com|dept|CA|
Canadian Tire|canadiantire.ca|dept|CA|
Simons|simons.ca|fashion|CA|
Liverpool|liverpool.com.mx|dept|MX|
Falabella|falabella.com|dept|CL,CO|
Ripley|simple.ripley.cl|dept|CL|
Magazine Luiza|magazineluiza.com.br|dept|BR|
Americanas|americanas.com.br|dept|BR|
Casas Bahia|casasbahia.com.br|dept|BR|
Argos|argos.co.uk|dept|GB|/search/{q}/
John Lewis|johnlewis.com|dept|GB|/search?search-term={q}
Marks and Spencer|marksandspencer.com|dept|GB,WW|
Selfridges|selfridges.com|luxury|GB,WW|
Harrods|harrods.com|luxury|GB,WW|
Harvey Nichols|harveynichols.com|luxury|GB|
Next|next.co.uk|fashion|GB,WW|
Debenhams|debenhams.com|dept|GB|
Very|very.co.uk|dept|GB|
Littlewoods|littlewoods.com|dept|GB|
TK Maxx|tkmaxx.com|dept|GB,IE|
Brown Thomas|brownthomas.com|luxury|IE|
Dunnes Stores|dunnesstores.com|dept|IE|
Galeries Lafayette|galerieslafayette.com|luxury|FR|
Printemps|printemps.com|luxury|FR|
KaDeWe|kadewe.de|luxury|DE|
Breuninger|breuninger.com|luxury|DE,AT,CH|
Manor|manor.ch|dept|CH|
Rinascente|rinascente.it|luxury|IT|
de Bijenkorf|debijenkorf.nl|dept|NL|
Lotte On|lotteon.com|dept|KR|
Takashimaya|takashimaya.co.jp|dept|JP|
Isetan|isetan.mistore.jp|dept|JP|
Best Buy|bestbuy.com|tech|US|/site/searchpage.jsp?st={q}
Best Buy Canada|bestbuy.ca|tech|CA|/en-ca/search?search={q}
Newegg|newegg.com|tech|US,CA|/p/pl?d={q}
B and H Photo|bhphotovideo.com|tech|US,WW|/c/search?q={q}
Adorama|adorama.com|tech|US|
Micro Center|microcenter.com|tech|US|/search/search_results.aspx?Ntt={q}
Apple|apple.com|tech|WW|
Samsung|samsung.com|tech|WW|
Google Store|store.google.com|tech|WW|
Microsoft Store|microsoft.com|tech|WW|
Dell|dell.com|tech|WW|
HP|hp.com|tech|WW|
Lenovo|lenovo.com|tech|WW|
Asus|asus.com|tech|WW|
Logitech|logitech.com|tech|WW|
Sony|electronics.sony.com|tech|US|
Bose|bose.com|tech|WW|
Sonos|sonos.com|tech|WW|
Anker|anker.com|tech|WW|S
Nothing|nothing.tech|tech|WW|S|sh
OnePlus|oneplus.com|tech|WW|
Xiaomi|mi.com|tech|WW|
Framework|frame.work|tech|US,CA,GB,DE,FR,NL,AU|
Raspberry Pi|raspberrypi.com|tech|WW|
Adafruit|adafruit.com|tech|US,WW|
SparkFun|sparkfun.com|tech|US,WW|
Crutchfield|crutchfield.com|tech|US|
Monoprice|monoprice.com|tech|US|
Currys|currys.co.uk|tech|GB|/search?q={q}
AO|ao.com|tech|GB|
Scan|scan.co.uk|tech|GB|
Overclockers UK|overclockers.co.uk|tech|GB|
Box|box.co.uk|tech|GB|
MediaMarkt|mediamarkt.de|tech|DE|
Saturn|saturn.de|tech|DE|
Cyberport|cyberport.de|tech|DE|
Notebooksbilliger|notebooksbilliger.de|tech|DE|
JB Hi-Fi|jbhifi.com.au|tech|AU||sh
Harvey Norman|harveynorman.com.au|tech|AU|
The Good Guys|thegoodguys.com.au|tech|AU|
Officeworks|officeworks.com.au|office|AU|
Noel Leeming|noelleeming.co.nz|tech|NZ|
PB Tech|pbtech.co.nz|tech|NZ|
Memory Express|memoryexpress.com|tech|CA|
Canada Computers|canadacomputers.com|tech|CA|
Visions Electronics|visions.ca|tech|CA|
Challenger|challenger.sg|tech|SG||sh
Courts|courts.com.sg|tech|SG|
Back Market|backmarket.com|tech|WW|
Swappa|swappa.com|tech|US|
IKEA|ikea.com|home|WW|
Wayfair|wayfair.com|home|US,CA,GB,DE|/keyword.php?keyword={q}
Home Depot|homedepot.com|diy|US|/s/{q}
Lowe's|lowes.com|diy|US|/search?searchTerm={q}
Menards|menards.com|diy|US|
Ace Hardware|acehardware.com|diy|US|
Harbor Freight|harborfreight.com|diy|US|
Tractor Supply|tractorsupply.com|diy|US|
Home Depot Canada|homedepot.ca|diy|CA|
Rona|rona.ca|diy|CA|
B and Q|diy.com|diy|GB|
Screwfix|screwfix.com|diy|GB|
Toolstation|toolstation.com|diy|GB|
Wickes|wickes.co.uk|diy|GB|
Homebase|homebase.co.uk|diy|GB|
OBI|obi.de|diy|DE,AT|
Hornbach|hornbach.de|diy|DE|
Bauhaus|bauhaus.info|diy|DE|
Leroy Merlin|leroymerlin.fr|diy|FR|
Castorama|castorama.fr|diy|FR|
Bunnings|bunnings.com.au|diy|AU,NZ|
Mitre 10|mitre10.co.nz|diy|NZ|
Crate and Barrel|crateandbarrel.com|home|US,CA|
CB2|cb2.com|home|US|
West Elm|westelm.com|home|US,WW|
Pottery Barn|potterybarn.com|home|US|
Williams Sonoma|williams-sonoma.com|home|US|
Restoration Hardware|rh.com|home|US|
Article|article.com|home|US,CA|
Burrow|burrow.com|home|US||sh
Floyd|floydhome.com|home|US|S|sh
Joybird|joybird.com|home|US|
Arhaus|arhaus.com|home|US|
Ashley|ashleyfurniture.com|home|US|
La-Z-Boy|la-z-boy.com|home|US|
Room and Board|roomandboard.com|home|US|
Design Within Reach|dwr.com|home|US|
Target Home|target.com/c/home|home|US|
HomeGoods|homegoods.com|home|US|
Bed Bath and Beyond|bedbathandbeyond.com|home|US|
Kirkland's|kirklands.com|home|US|
At Home|athome.com|home|US|
World Market|worldmarket.com|home|US|
Anthropologie|anthropologie.com|home|US,GB,WW|
Made|made.com|home|GB|
Dunelm|dunelm.com|home|GB|
The White Company|thewhitecompany.com|home|GB,US|
Habitat|habitat.co.uk|home|GB|
Oak Furnitureland|oakfurnitureland.co.uk|home|GB|
Loaf|loaf.com|home|GB|
Westwing|westwing.de|home|DE,FR,IT,ES,NL,PL|
Home24|home24.de|home|DE,AT,FR,NL,CH|
Maisons du Monde|maisonsdumonde.com|home|FR,ES,IT,DE,BE|
Zara Home|zarahome.com|home|WW|
H and M Home|hm.com/home|home|WW|
Temple and Webster|templeandwebster.com.au|home|AU|
Adairs|adairs.com.au|home|AU|
Structube|structube.com|home|CA|
Nitori|nitori-net.jp|home|JP|
Brooklinen|brooklinen.com|home|US|S|sh
Parachute|parachutehome.com|home|US|S|sh
Casper|casper.com|home|US,CA||sh
Purple|purple.com|home|US|
Tuft and Needle|tuftandneedle.com|home|US||sh
Saatva|saatva.com|home|US|
Emma|emma-sleep.com|home|WW||sh
Ruggable|ruggable.com|home|US,CA,GB,AU|S|sh
Our Place|fromourplace.com|home|US,CA,GB,AU|S|sh
Caraway|carawayhome.com|home|US,CA|S
HexClad|hexclad.com|home|US,CA,GB,AU|S|sh
Le Creuset|lecreuset.com|home|US|
Dyson|dyson.com|home|WW|
iRobot|irobot.com|home|WW|
Philips|philips.com|home|WW|
SharkNinja|sharkninja.com|home|US|
Breville|breville.com|home|WW|
Nespresso|nespresso.com|home|WW|
Zara|zara.com|fashion|WW|
H and M|hm.com|fashion|WW|
Mango|shop.mango.com|fashion|WW|
Bershka|bershka.com|fashion|WW|
Pull and Bear|pullandbear.com|fashion|WW|
Stradivarius|stradivarius.com|fashion|WW|
Massimo Dutti|massimodutti.com|fashion|WW|
COS|cos.com|fashion|WW|
Arket|arket.com|fashion|WW|
& Other Stories|stories.com|fashion|WW|
Weekday|weekday.com|fashion|WW|
Monki|monki.com|fashion|WW|
Primark|primark.com|fashion|GB,IE,ES,DE,FR,US|
ASOS|asos.com|fashion|WW|/search/?q={q}
Boohoo|boohoo.com|fashion|WW|
PrettyLittleThing|prettylittlething.com|fashion|WW|
Missguided|missguided.com|fashion|GB|
Nasty Gal|nastygal.com|fashion|WW|
SHEIN|shein.com|fashion|WW|/pdsearch/{q}/
Fashion Nova|fashionnova.com|fashion|WW|S
Princess Polly|us.princesspolly.com|fashion|WW|S|sh
Revolve|revolve.com|fashion|WW|
Free People|freepeople.com|fashion|WW|
Urban Outfitters|urbanoutfitters.com|fashion|WW|
Gap|gap.com|fashion|US,CA|/browse/search.do?searchText={q}
Old Navy|oldnavy.gap.com|fashion|US,CA|/browse/search.do?searchText={q}
Banana Republic|bananarepublic.gap.com|fashion|US,CA|/browse/search.do?searchText={q}
Abercrombie and Fitch|abercrombie.com|fashion|WW|
Hollister|hollisterco.com|fashion|WW|
American Eagle|ae.com|fashion|US,CA,WW|
J.Crew|jcrew.com|fashion|US,WW|
Madewell|madewell.com|fashion|US|
Everlane|everlane.com|fashion|US,CA,WW||sh
Levi's|levi.com|fashion|WW|
Ralph Lauren|ralphlauren.com|fashion|WW|
Tommy Hilfiger|tommy.com|fashion|WW|
Calvin Klein|calvinklein.us|fashion|US|
Lacoste|lacoste.com|fashion|WW|
Express|express.com|fashion|US|
Forever 21|forever21.com|fashion|US||sh
Aritzia|aritzia.com|fashion|CA,US|
Lululemon|shop.lululemon.com|sport|US,CA,WW|
Athleta|athleta.gap.com|sport|US|
Alo Yoga|aloyoga.com|sport|WW|S|sh
Vuori|vuoriclothing.com|sport|US,WW|S
Gymshark|gymshark.com|sport|WW|S
Outdoor Voices|outdoorvoices.com|sport|US|S|sh
Skims|skims.com|fashion|WW|S|sh
Savage X Fenty|savagex.com|fashion|US,GB,DE,FR|
Victoria's Secret|victoriassecret.com|fashion|WW|
Aerie|ae.com/aerie|fashion|US|
Spanx|spanx.com|fashion|US||sh
Patagonia|patagonia.com|sport|WW|
The North Face|thenorthface.com|sport|WW|
Arc'teryx|arcteryx.com|sport|WW|
Columbia|columbia.com|sport|WW|
Canada Goose|canadagoose.com|luxury|WW|
Superdry|superdry.com|fashion|WW|
River Island|riverisland.com|fashion|GB,WW|
Topshop|topshop.com|fashion|WW|
New Look|newlook.com|fashion|GB|
JD Sports|jdsports.co.uk|sport|GB,WW|
Sports Direct|sportsdirect.com|sport|GB,WW|
Frasers|frasers.com|dept|GB|
FatFace|fatface.com|fashion|GB|
Joules|joules.com|fashion|GB|
Boden|boden.com|fashion|GB,US,DE||sh
Seasalt Cornwall|seasaltcornwall.com|fashion|GB|
AllSaints|allsaints.com|fashion|WW|
Ted Baker|tedbaker.com|fashion|WW||sh
Reiss|reiss.com|fashion|WW|
Whistles|whistles.com|fashion|GB|
Jigsaw|jigsaw-online.com|fashion|GB||sh
Hobbs|hobbs.com|fashion|GB|
Sezane|sezane.com|fashion|WW|
Maje|maje.com|fashion|WW|
Sandro|sandro-paris.com|fashion|WW|
The Kooples|thekooples.com|fashion|WW|
Kiabi|kiabi.com|fashion|FR,ES,IT,BE|
C and A|c-and-a.com|fashion|DE,FR,NL,BE,ES,AT,CH,PL|
s.Oliver|soliver.com|fashion|DE,AT,CH|
Esprit|esprit.com|fashion|WW|
Marc O'Polo|marc-o-polo.com|fashion|DE,WW|
Hugo Boss|hugoboss.com|fashion|WW|
Desigual|desigual.com|fashion|WW|
Benetton|benetton.com|fashion|WW||sh
Calzedonia|calzedonia.com|fashion|WW|
Intimissimi|intimissimi.com|fashion|WW|
Tezenis|tezenis.com|fashion|WW|
Na-kd|na-kd.com|fashion|WW|
Lindex|lindex.com|fashion|SE,NO,FI|
KappAhl|kappahl.com|fashion|SE,NO,FI|
Reserved|reserved.com|fashion|PL,CZ,RO,DE|
LPP Sinsay|sinsay.com|fashion|PL,CZ,RO|
LC Waikiki|lcwaikiki.com|fashion|TR,WW|
Koton|koton.com|fashion|TR|
Defacto|defacto.com|fashion|TR,WW|
Max Fashion|maxfashion.com|fashion|AE,SA,IN|
Centrepoint|centrepointstores.com|dept|AE,SA|
Ounass|ounass.ae|luxury|AE,SA|
Level Shoes|levelshoes.com|shoes|AE|
Witchery|witchery.com.au|fashion|AU||sh
Country Road|countryroad.com.au|fashion|AU||sh
Cotton On|cottonon.com|fashion|AU,NZ,WW|
Glassons|glassons.com|fashion|NZ,AU|
The Iconic|theiconic.com.au|fashion|AU|
Showpo|showpo.com|fashion|AU,WW|S|sh
Hello Molly|hellomolly.com|fashion|AU,WW|S
Universal Store|universalstore.com|fashion|AU||sh
Mr Price|mrp.com|fashion|ZA|
Woolworths South Africa|woolworths.co.za|dept|ZA|
Dafiti|dafiti.com.br|fashion|BR|
Renner|lojasrenner.com.br|fashion|BR|
Riachuelo|riachuelo.com.br|fashion|BR|
Coppel|coppel.com|dept|MX|
Farfetch|farfetch.com|luxury|WW|
Net-a-Porter|net-a-porter.com|luxury|WW|
Mr Porter|mrporter.com|luxury|WW|
Mytheresa|mytheresa.com|luxury|WW|
SSENSE|ssense.com|luxury|WW|
MatchesFashion|matchesfashion.com|luxury|WW|
Luisaviaroma|luisaviaroma.com|luxury|WW|
The RealReal|therealreal.com|luxury|US|
Vestiaire Collective|vestiairecollective.com|luxury|WW|
Gucci|gucci.com|luxury|WW|
Louis Vuitton|louisvuitton.com|luxury|WW|
Prada|prada.com|luxury|WW|
Burberry|burberry.com|luxury|WW|
Balenciaga|balenciaga.com|luxury|WW|
Saint Laurent|ysl.com|luxury|WW|
Bottega Veneta|bottegaveneta.com|luxury|WW|
Moncler|moncler.com|luxury|WW|
Dior|dior.com|luxury|WW|
Hermes|hermes.com|luxury|WW|
Coach|coach.com|luxury|WW|
Michael Kors|michaelkors.com|luxury|WW|
Kate Spade|katespade.com|fashion|WW|
Tory Burch|toryburch.com|luxury|WW|
Longchamp|longchamp.com|luxury|WW|
Nike|nike.com|shoes|WW|/w?q={q}
Adidas|adidas.com|shoes|WW|
Puma|puma.com|shoes|WW|
New Balance|newbalance.com|shoes|WW|
Asics|asics.com|shoes|WW|
Reebok|reebok.com|shoes|WW||sh
Vans|vans.com|shoes|WW|
Converse|converse.com|shoes|WW|
Skechers|skechers.com|shoes|WW|
On|on.com|shoes|WW|
Hoka|hoka.com|shoes|WW|
Brooks|brooksrunning.com|shoes|WW|
Saucony|saucony.com|shoes|WW|
Salomon|salomon.com|shoes|WW|
Dr. Martens|drmartens.com|shoes|WW|
Birkenstock|birkenstock.com|shoes|WW|
Crocs|crocs.com|shoes|WW|
UGG|ugg.com|shoes|WW|
Timberland|timberland.com|shoes|WW|
Clarks|clarks.com|shoes|WW|
Allbirds|allbirds.com|shoes|US,CA,GB,AU,WW|S|sh
Rothy's|rothys.com|shoes|US,CA,GB,AU|S|sh
Veja|veja-store.com|shoes|WW|
Zappos|zappos.com|shoes|US|/search?term={q}
DSW|dsw.com|shoes|US|
Foot Locker|footlocker.com|shoes|US,WW|
Finish Line|finishline.com|shoes|US|
Famous Footwear|famousfootwear.com|shoes|US|
Journeys|journeys.com|shoes|US|
StockX|stockx.com|shoes|WW|/search?s={q}
GOAT|goat.com|shoes|WW|
Kith|kith.com|shoes|US,WW|S|sh
End Clothing|endclothing.com|fashion|WW||sh
Size?|size.co.uk|shoes|GB|
Schuh|schuh.co.uk|shoes|GB|
Office Shoes|office.co.uk|shoes|GB|
Deichmann|deichmann.com|shoes|DE,AT,CH,WW|
Snipes|snipes.com|shoes|DE,WW|
Footasylum|footasylum.com|shoes|GB|
Platypus|platypusshoes.com.au|shoes|AU|
REI|rei.com|sport|US|/search?q={q}
Dick's Sporting Goods|dickssportinggoods.com|sport|US|
Academy Sports|academy.com|sport|US|
Bass Pro Shops|basspro.com|sport|US|
Cabela's|cabelas.com|sport|US|
Backcountry|backcountry.com|sport|US|
Moosejaw|moosejaw.com|sport|US|
Decathlon|decathlon.com|sport|WW||sh
Sport Chek|sportchek.ca|sport|CA|
MEC|mec.ca|sport|CA|
Intersport|intersport.com|sport|WW|
Go Outdoors|gooutdoors.co.uk|sport|GB|
Cotswold Outdoor|cotswoldoutdoor.com|sport|GB|
Bergfreunde|bergfreunde.de|sport|DE,WW|
Bergzeit|bergzeit.de|sport|DE,AT|
Rebel|rebelsport.com.au|sport|AU|
Anaconda|anacondastores.com|sport|AU|
Kathmandu|kathmandu.com.au|sport|AU,NZ||sh
Wiggle|wiggle.com|auto|WW|
Chain Reaction Cycles|chainreactioncycles.com|auto|WW|
Rapha|rapha.cc|sport|WW|
Peloton|onepeloton.com|sport|US,CA,GB,DE,AU|
Rogue Fitness|roguefitness.com|sport|US,WW|
YETI|yeti.com|sport|US,WW|
Stanley|stanley1913.com|home|WW|S|sh
Hydro Flask|hydroflask.com|sport|WW|
Osprey|osprey.com|sport|WW|
Fjallraven|fjallraven.com|sport|WW|
Sephora|sephora.com|beauty|US,CA|/search?keyword={q}
Sephora UK|sephora.co.uk|beauty|GB|
Sephora France|sephora.fr|beauty|FR|
Ulta Beauty|ulta.com|beauty|US|
Boots|boots.com|health|GB|
Superdrug|superdrug.com|health|GB|
LookFantastic|lookfantastic.com|beauty|WW|
Cult Beauty|cultbeauty.co.uk|beauty|WW|
Space NK|spacenk.com|beauty|GB,US|
Beauty Bay|beautybay.com|beauty|WW|
Feelunique|feelunique.com|beauty|GB|
Douglas|douglas.de|beauty|DE,AT,NL,PL,IT|
Notino|notino.com|beauty|WW|
Flaconi|flaconi.de|beauty|DE,AT|
Nocibe|nocibe.fr|beauty|FR|
Mecca|mecca.com|beauty|AU,NZ|
Adore Beauty|adorebeauty.com.au|beauty|AU|
Priceline Pharmacy|priceline.com.au|health|AU|
Shoppers Drug Mart|shoppersdrugmart.ca|health|CA|
YesStyle|yesstyle.com|beauty|WW|
Stylevana|stylevana.com|beauty|WW|
Glossier|glossier.com|beauty|US,CA,GB,FR|S
Fenty Beauty|fentybeauty.com|beauty|WW||sh
Rare Beauty|rarebeauty.com|beauty|US,CA,GB||sh
Kylie Cosmetics|kyliecosmetics.com|beauty|WW|S|sh
ColourPop|colourpop.com|beauty|WW|S|sh
Rhode|rhodeskin.com|beauty|US,CA,GB|S
The Ordinary|theordinary.com|beauty|WW|
Charlotte Tilbury|charlottetilbury.com|beauty|WW|
MAC Cosmetics|maccosmetics.com|beauty|WW||sh
Clinique|clinique.com|beauty|WW|
Estee Lauder|esteelauder.com|beauty|WW|
Lush|lush.com|beauty|WW|
The Body Shop|thebodyshop.com|beauty|WW||sh
Bath and Body Works|bathandbodyworks.com|beauty|US,CA|
L'Occitane|loccitane.com|beauty|WW|
Kiehl's|kiehls.com|beauty|WW|
Drunk Elephant|drunkelephant.com|beauty|WW|
Dermstore|dermstore.com|beauty|US|
Native|nativecos.com|beauty|US|S
Manscaped|manscaped.com|beauty|WW|S
Harry's|harrys.com|beauty|US,GB||sh
Dollar Shave Club|dollarshaveclub.com|beauty|US||sh
Function of Beauty|functionofbeauty.com|beauty|US||sh
Olaplex|olaplex.com|beauty|WW||sh
CVS|cvs.com|health|US|
Walgreens|walgreens.com|health|US|
Rite Aid|riteaid.com|health|US|
iHerb|iherb.com|health|WW|/search?kw={q}
Vitacost|vitacost.com|health|US||sh
GNC|gnc.com|health|US|
Holland and Barrett|hollandandbarrett.com|health|GB|
Myprotein|myprotein.com|health|WW|
Huel|huel.com|health|WW|S|sh
Chemist Warehouse|chemistwarehouse.com.au|health|AU|
DocMorris|docmorris.de|health|DE|
Shop Apotheke|shop-apotheke.com|health|DE,AT|
dm|dm.de|health|DE,AT|
Rossmann|rossmann.de|health|DE|
Watsons|watsons.com.sg|health|SG,MY,HK,TH|
Guardian|guardian.com.sg|health|SG,MY|
Apollo Pharmacy|apollopharmacy.in|health|IN|
Tata 1mg|1mg.com|health|IN|
Warby Parker|warbyparker.com|health|US,CA|
Zenni|zennioptical.com|health|WW|
1-800 Contacts|1800contacts.com|health|US|
Instacart|instacart.com|grocery|US,CA|
Whole Foods|wholefoodsmarket.com|grocery|US|
Kroger|kroger.com|grocery|US|
Safeway|safeway.com|grocery|US|
Albertsons|albertsons.com|grocery|US|
Publix|publix.com|grocery|US|
H-E-B|heb.com|grocery|US|
Wegmans|wegmans.com|grocery|US|
Trader Joe's|traderjoes.com|grocery|US|
Thrive Market|thrivemarket.com|grocery|US|
Weee|sayweee.com|grocery|US|
Loblaws|loblaws.ca|grocery|CA|
Sobeys|sobeys.com|grocery|CA|
Tesco|tesco.com|grocery|GB,IE|
Sainsbury's|sainsburys.co.uk|grocery|GB|
Asda|asda.com|grocery|GB|
Morrisons|groceries.morrisons.com|grocery|GB|
Waitrose|waitrose.com|grocery|GB|
Ocado|ocado.com|grocery|GB|
Iceland|iceland.co.uk|grocery|GB|
Aldi|aldi.com|grocery|WW|
Lidl|lidl.com|grocery|WW|
Rewe|shop.rewe.de|grocery|DE|
Edeka|edeka.de|grocery|DE|
Carrefour|carrefour.fr|grocery|FR|
Auchan|auchan.fr|grocery|FR|
Leclerc|e.leclerc|grocery|FR|
Albert Heijn|ah.nl|grocery|NL|
Jumbo|jumbo.com|grocery|NL|
Mercadona|mercadona.es|grocery|ES|
Esselunga|esselunga.it|grocery|IT|
Coop|coop.ch|grocery|CH|
Migros|migros.ch|grocery|CH|
ICA|ica.se|grocery|SE|
Woolworths|woolworths.com.au|grocery|AU|
Coles|coles.com.au|grocery|AU|
Countdown|woolworths.co.nz|grocery|NZ|
Countdown New World|newworld.co.nz|grocery|NZ|
FairPrice|fairprice.com.sg|grocery|SG|
RedMart|redmart.lazada.sg|grocery|SG|
Aeon|aeon.com|grocery|JP,MY|
Checkers|checkers.co.za|grocery|ZA|
Pick n Pay|pnp.co.za|grocery|ZA|
Swiggy Instamart|swiggy.com/instamart|grocery|IN|
Blinkit|blinkit.com|grocery|IN|
Lulu Hypermarket|luluhypermarket.com|grocery|AE,SA|
Panda|panda.com.sa|grocery|SA|
Death Wish Coffee|deathwishcoffee.com|grocery|US|S|sh
Blue Bottle|bluebottlecoffee.com|grocery|US,JP|
Graze|graze.com|grocery|GB||sh
Toys R Us|toysrus.com|kids|US,CA,WW||sh
Smyths Toys|smythstoys.com|kids|GB,IE,DE|
The Entertainer|thetoyshop.com|kids|GB|
Hamleys|hamleys.com|kids|GB,WW|
LEGO|lego.com|kids|WW|
Mattel|shop.mattel.com|kids|US||sh
Build-A-Bear|buildabear.com|kids|US,GB|
Carter's|carters.com|kids|US,CA|
The Children's Place|childrensplace.com|kids|US,CA|
Gymboree|gymboree.com|kids|US|
Primary|primary.com|kids|US|S|sh
Hanna Andersson|hannaandersson.com|kids|US|
Mothercare|mothercare.com|kids|WW|
JoJo Maman Bebe|jojomamanbebe.com|kids|GB,US|
Mamas and Papas|mamasandpapas.com|kids|GB||sh
Buy Buy Baby|buybuybaby.com|kids|US|
Babylist|babylist.com|kids|US|
Pottery Barn Kids|potterybarnkids.com|kids|US|
Vertbaudet|vertbaudet.fr|kids|FR|
Jako-o|jako-o.com|kids|DE|
Mytoys|mytoys.de|kids|DE|
Toyworld|toyworld.com.au|kids|AU||sh
Mr Toys|mrtoys.com.au|kids|AU|
FirstCry|firstcry.com|kids|IN,AE,SA|
Mumzworld|mumzworld.com|kids|AE,SA|
Barnes and Noble|barnesandnoble.com|books|US|/s/{q}
Bookshop|bookshop.org|books|US,GB|/search?keywords={q}
Books-A-Million|booksamillion.com|books|US|
Powell's|powells.com|books|US|
Half Price Books|hpb.com|books|US|
ThriftBooks|thriftbooks.com|books|US|
AbeBooks|abebooks.com|books|WW|
Waterstones|waterstones.com|books|GB|
WHSmith|whsmith.co.uk|books|GB|
Blackwell's|blackwells.co.uk|books|WW|
Foyles|foyles.co.uk|books|GB|
World of Books|wob.com|books|WW||sh
Thalia|thalia.de|books|DE,AT|
Hugendubel|hugendubel.de|books|DE|
Decitre|decitre.fr|books|FR|
Casa del Libro|casadellibro.com|books|ES|
Indigo|indigo.ca|books|CA||sh
Booktopia|booktopia.com.au|books|AU|
Dymocks|dymocks.com.au|books|AU|
Kinokuniya|kinokuniya.com|books|JP,SG,WW|
Kobo|kobo.com|books|WW|
Audible|audible.com|books|WW|
Discogs|discogs.com|books|WW|
HMV|hmv.com|books|GB|
Amoeba Music|amoeba.com|books|US|
Rough Trade|roughtrade.com|books|GB,US|
Criterion|criterion.com|books|US|
Steam|store.steampowered.com|games|WW|/search/?term={q}
GOG|gog.com|games|WW|
Epic Games Store|store.epicgames.com|games|WW|
Humble Bundle|humblebundle.com|games|WW|
Nintendo|nintendo.com|games|WW|
PlayStation Store|store.playstation.com|games|WW|
Xbox|xbox.com|games|WW|
GameStop|gamestop.com|games|US,CA|/search/?q={q}
GAME|game.co.uk|games|GB|
CeX|uk.webuy.com|games|GB,WW|
Fanatical|fanatical.com|games|WW|
Green Man Gaming|greenmangaming.com|games|WW|
EB Games|ebgames.com.au|games|AU,NZ|
Play-Asia|play-asia.com|games|WW|
Limited Run Games|limitedrungames.com|games|WW|S|sh
Razer|razer.com|games|WW|
Corsair|corsair.com|games|WW|
SteelSeries|steelseries.com|games|WW|
Secretlab|secretlab.co|games|WW|
Elgato|elgato.com|games|WW|
Chewy|chewy.com|pets|US|/s?query={q}
Petco|petco.com|pets|US|
PetSmart|petsmart.com|pets|US|
Pets at Home|petsathome.com|pets|GB|
Zooplus|zooplus.com|pets|DE,FR,IT,ES,NL,PL,GB,WW|
Fressnapf|fressnapf.de|pets|DE,AT|
Petbarn|petbarn.com.au|pets|AU|
PetSmart Canada|petsmart.ca|pets|CA|
Pet Valu|petvalu.ca|pets|CA|
BarkBox|barkbox.com|pets|US|
Wild One|wildone.com|pets|US|S|sh
Tiffany|tiffany.com|jewelry|WW|
Cartier|cartier.com|jewelry|WW|
Pandora|pandora.net|jewelry|WW|
Swarovski|swarovski.com|jewelry|WW|
Mejuri|mejuri.com|jewelry|WW||sh
Kay Jewelers|kay.com|jewelry|US|
Zales|zales.com|jewelry|US|
Blue Nile|bluenile.com|jewelry|WW|
Brilliant Earth|brilliantearth.com|jewelry|WW|
Monica Vinader|monicavinader.com|jewelry|WW|
Missoma|missoma.com|jewelry|WW||sh
Astrid and Miyu|astridandmiyu.com|jewelry|GB,WW||sh
Pura Vida|puravidabracelets.com|jewelry|US,WW|S|sh
Ana Luisa|analuisa.com|jewelry|US,WW|S
Daniel Wellington|danielwellington.com|jewelry|WW||sh
Fossil|fossil.com|jewelry|WW|
MVMT|mvmt.com|jewelry|WW|S|sh
Casio|casio.com|jewelry|WW|
Seiko|seikowatches.com|jewelry|WW|
Swatch|swatch.com|jewelry|WW|
Chrono24|chrono24.com|jewelry|WW|
Watches of Switzerland|watchesofswitzerland.com|jewelry|GB,US||sh
Goldsmiths|goldsmiths.co.uk|jewelry|GB|
H. Samuel|hsamuel.co.uk|jewelry|GB|
Christ|christ.de|jewelry|DE|
Michael Hill|michaelhill.com.au|jewelry|AU,NZ,CA|
Tanishq|tanishq.co.in|jewelry|IN|
CaratLane|caratlane.com|jewelry|IN|
Chow Tai Fook|chowtaifook.com|jewelry|HK,CN|
Staples|staples.com|office|US|
Office Depot|officedepot.com|office|US|
Staples Canada|staples.ca|office|CA|
Viking|viking-direct.co.uk|office|GB|
Ryman|ryman.co.uk|office|GB|
Paperchase|paperchase.com|office|GB|
Moleskine|moleskine.com|office|WW|
Leuchtturm1917|leuchtturm1917.com|office|WW|
Muji Stationery|muji.us|office|US||sh
JetPens|jetpens.com|office|US,WW|
Goulet Pens|gouletpens.com|office|US||sh
Michaels|michaels.com|office|US,CA|
Joann|joann.com|office|US|
Hobby Lobby|hobbylobby.com|office|US|
Blick Art Materials|dickblick.com|office|US|
Hobbycraft|hobbycraft.co.uk|office|GB|
Cass Art|cassart.co.uk|office|GB|
Spotlight|spotlightstores.com|office|AU,NZ|
Lincraft|lincraft.com.au|office|AU||sh
Cricut|cricut.com|office|WW|
Etsy Craft Supplies|etsy.com/c/craft-supplies-and-tools|office|WW|
AutoZone|autozone.com|auto|US|
Advance Auto Parts|advanceautoparts.com|auto|US|
O'Reilly Auto Parts|oreillyauto.com|auto|US|
RockAuto|rockauto.com|auto|US,WW|
NAPA|napaonline.com|auto|US|
Tire Rack|tirerack.com|auto|US|
Halfords|halfords.com|auto|GB|
Euro Car Parts|eurocarparts.com|auto|GB|
ATU|atu.de|auto|DE,AT|
Autodoc|autodoc.co.uk|auto|WW|
Supercheap Auto|supercheapauto.com.au|auto|AU,NZ|
Repco|repco.com.au|auto|AU,NZ|
Canadian Tire Auto|canadiantire.ca/en/automotive.html|auto|CA|
Revzilla|revzilla.com|auto|US|
Competitive Cyclist|competitivecyclist.com|auto|US|
Trek|trekbikes.com|auto|WW|
Specialized|specialized.com|auto|WW|
Canyon|canyon.com|auto|WW|
Brompton|brompton.com|auto|WW|
VanMoof|vanmoof.com|auto|WW|
Rad Power Bikes|radpowerbikes.com|auto|US,CA,WW||sh
Bike24|bike24.com|auto|DE,WW|
Bike Discount|bike-discount.de|auto|DE,WW|
Evans Cycles|evanscycles.com|auto|GB|
Sweetwater|sweetwater.com|tech|US|/store/search.php?s={q}
Guitar Center|guitarcenter.com|tech|US|
Thomann|thomann.de|tech|WW|
Gear4music|gear4music.com|tech|WW|
Reverb|reverb.com|tech|WW|/marketplace?query={q}
Musician's Friend|musiciansfriend.com|tech|US|
Long and McQuade|long-mcquade.com|tech|CA|
Fender|fender.com|tech|WW|
Bombas|bombas.com|indie|US,CA|S
Tentree|tentree.com|indie|WW|S|sh
Taylor Stitch|taylorstitch.com|indie|US|S|sh
Chubbies|chubbiesshorts.com|indie|US|S
Ridge|ridge.com|indie|WW|S
Away|awaytravel.com|indie|US,CA,GB||sh
Bellroy|bellroy.com|indie|WW|S
Peak Design|peakdesign.com|indie|WW|S
Nomad|nomadgoods.com|indie|WW|S|sh
Native Union|nativeunion.com|indie|WW|S|sh
Casetify|casetify.com|indie|WW|
Dbrand|dbrand.com|indie|WW|
Grovemade|grovemade.com|indie|US,WW|S
Allmodern|allmodern.com|home|US|
Quince|quince.com|indie|US|
Cuyana|cuyana.com|indie|US|S|sh
Bearaby|bearaby.com|indie|US,GB,DE|S|sh
Brooklyn Tea|brooklyntea.com|indie|US||sh
Mud Wtr|mudwtr.com|indie|US|S|sh
Liquid Death|liquiddeath.com|indie|US|S|sh
Olipop|drinkolipop.com|indie|US|S|sh
Graza|graza.co|indie|US|S|sh
Fishwife|eatfishwife.com|indie|US|S|sh
Brightland|brightland.co|indie|US|S|sh
Omsom|omsom.com|indie|US|S
Haus Labs|hauslabs.com|beauty|US,CA,GB|
Summer Fridays|summerfridays.com|beauty|US,WW|S|sh
Tower 28|tower28beauty.com|beauty|US|S
Merit|meritbeauty.com|beauty|US|S|sh
Kosas|kosas.com|beauty|US|S|sh
Ilia|iliabeauty.com|beauty|US|S|sh
Supergoop|supergoop.com|beauty|US|S|sh
Byredo|byredo.com|beauty|WW|
Le Labo|lelabofragrances.com|beauty|WW|
Diptyque|diptyqueparis.com|beauty|WW||sh
Aesop|aesop.com|beauty|WW|
Jo Malone|jomalone.com|beauty|WW|
Grailed|grailed.com|fashion|WW|
Depop|depop.com|fashion|WW|
Poshmark|poshmark.com|fashion|US,CA|
ThredUp|thredup.com|fashion|US|
Facebook Marketplace|facebook.com/marketplace|market|WW|
OfferUp|offerup.com|market|US|
Craigslist|craigslist.org|market|US,WW|
Gumtree|gumtree.com|market|GB|
Kijiji|kijiji.ca|market|CA|
Marktplaats|marktplaats.nl|market|NL|
Kleinanzeigen|kleinanzeigen.de|market|DE|
Willhaben|willhaben.at|market|AT|
Subito|subito.it|market|IT|
OLX|olx.com|market|WW|
Avito|avito.ru|market|WW|
Wish|wish.com|market|WW|
Joom|joom.com|market|WW|
DHgate|dhgate.com|market|WW|
Banggood|banggood.com|tech|WW|
Newchic|newchic.com|fashion|WW|
Zaful|zaful.com|fashion|WW|
Romwe|romwe.com|fashion|WW|
Cider|shopcider.com|fashion|WW|
Halara|thehalara.com|sport|WW||sh
Overstock|overstock.com|home|US|
Woot|woot.com|tech|US|
Slickdeals|slickdeals.net|market|US|
Groupon|groupon.com|market|US,WW|
Ollie's|ollies.us|dept|US||sh
Five Below|fivebelow.com|dept|US|
Dollar General|dollargeneral.com|dept|US|
Dollar Tree|dollartree.com|dept|US|
Big Lots|biglots.com|dept|US|
Meijer|meijer.com|dept|US|
Fred Meyer|fredmeyer.com|dept|US|
Hammacher Schlemmer|hammacher.com|dept|US|
Uncommon Goods|uncommongoods.com|indie|US|
Not On The High Street|notonthehighstreet.com|indie|GB|
Firebox|firebox.com|indie|GB,WW|
Menkind|menkind.co.uk|indie|GB|
Oliver Bonas|oliverbonas.com|home|GB|
Typo|cottonon.com/typo|office|AU,NZ|
Kikki.K|kikki-k.com|office|AU||sh
HTC|htc.com|tech|TW|
Chanel|chanel.com|fashion|FR|
Lidl|lidl.de|grocery|DE|
Amazon Prime Video|primevideo.com|books|US|
LG Electronics|lg.com|tech|KR|
Dolce and Gabbana|dolcegabbana.com|fashion|IT|
Harley-Davidson|harley-davidson.com|auto|US|
7-Eleven|7-eleven.com|grocery|WW|
PlayStation|playstation.com|indie|JP|
Carrefour|carrefour.com|grocery|BE,FR|
Deere and|deere.com|diy|US|
Givenchy|givenchy.com|fashion|FR|
Jagermeister|jagermeister.com|indie|DE|S|sh
GUM|gum.ru|dept|RU|
Under Armour|underarmour.com|fashion|US|
Fila|fila.com|fashion|IT,KR|
Napster|napster.com|office|US|
Gillette|gillette.com|indie|US|
Honeywell|honeywell.com|health|US|
Tissot|tissotwatches.com|jewelry|CH|
Breitling|breitling.com|jewelry|CH|
GoDaddy|godaddy.com|market|US|
Le Coq sportif|lecoqsportif.com|fashion|FR|S|sh
Stihl|stihl.com|diy|DE|
Braun|braun.com|tech|DE|
Hummel International|hummel.net|fashion|DK|S|sh
Shopify|shopify.com|market|CA|S
Valentino|valentino.com|fashion|FR,IT|
Bandcamp|bandcamp.com|games|US|
Playmobil|playmobil.com|indie|DE|
Beats Electronics|beatsbydre.com|tech|US|
Billa|billa.at|grocery|AT|
Head and Shoulders|headandshoulders.com|beauty|US|S|sh
Chloe|chloe.com|fashion|FR|
Moschino|moschino.com|fashion|IT|S|sh
Errea|errea.com|fashion|IT|
Renault Trucks|renault-trucks.fr|dept|FR|
OLX|olx.ro|market|RO|
National Rail|nationalrail.co.uk|sport|GB|
Roman Coppola|romancoppolastudio.com|dept|WW|
Shakespeare and|shakespeareandcompany.com|books|FR|
Montblanc International|montblanc.com|fashion|DE|
DKNY|dkny.com|fashion|US|S|sh
Macron|macron.com|fashion|IT|
Piaget|piaget.com|jewelry|CH|
Bang and Olufsen|bang-olufsen.com|tech|DK|
Quiksilver|quiksilver.fr|fashion|FR,US|
AUTODOC|autodoc.de|auto|DE|
Revlon|revlon.com|beauty|US|S|sh
Systembolaget|systembolaget.se|grocery|SE|
ViewSonic|viewsonic.com|tech|US|
Kenzo|kenzo.com|fashion|FR|
DeWALT|dewalt.com|indie|US|
Miu Miu|miumiu.com|fashion|IT|
Netgear|netgear.com|tech|US|
TVS Motor|tvsmotor.com|auto|IN|
Godiva Chocolatier|godiva.com|grocery|BE,JP,TR,US|S|sh
Giant Bicycles|giant-bicycles.com|auto|TW|
Arri|arri.com|tech|DE|
Lanvin|lanvin.com|fashion|FR|
Mitsubishi Fuso Truck and Bus|mitsubishi-fuso.com|auto|JP|
Volvo Trucks|volvotrucks.com|auto|SE|
Loewe|loewe.com|fashion|ES|
GANT|gant.com|fashion|SE|
HTC Vive|vive.com|indie|WW|S|sh
Prime|drinkprime.uk|indie|GB,US|S|sh
Kyivstar|kyivstar.ua|tech|UA|
Fiverr|fiverr.com|market|IL|
Cannondale Bicycle|cannondale.com|auto|US|
Iittala|iittala.com|home|FI|S|sh
Belkin International|belkin.com|tech|US|
Lotte|lotte.co.jp|tech|JP,KR|
Kiton|kiton.com|fashion|IT|S|sh
Jaeger-LeCoultre|jaeger-lecoultre.com|jewelry|CH|
Shopee|shopee.com|market|SG|
Tchibo|tchibo.com|grocery|DE|
Morrisons|morrisons.com|grocery|GB|
Flying Tiger Copenhagen|flyingtiger.com|dept|DK,GB|S|sh
Escada|escada.com|fashion|DE|S|sh
Penny|penny.it|grocery|DE|
Miniso|miniso.com|dept|CN|
Beatport|beatport.com|office|US|
Abt Sportsline|abt-sportsline.de|auto|DE|
Royal Copenhagen|royalcopenhagen.com|indie|DK|S|sh
J. Barbour and Sons|barbour.com|fashion|GB|
A. Lange and Sohne|alange-soehne.com|jewelry|DE|
Anta|anta.com|fashion|CN,KY|S|sh
Viki|viki.com|tech|US|
Pop Mart|popmart.com|kids|CN,KY|
Geox|geox.com|shoes|IT|
Off-White|off---white.com|fashion|IT|
Meccano|meccano.com|indie|FR|
Weleda|weleda.com|beauty|CH|
Rimmel|rimmellondon.com|beauty|GB|
Balmain|balmain.com|office|FR|S|sh
Chopard|chopard.de|jewelry|CH|
Upwork|upwork.com|market|US|
Burton Snowboards|burton.com|sport|US|S|sh
Champion USA|champion.com|fashion|AU,US|S|sh
Hallmark Cards|hallmark.com|office|US|
Castore|castore.com|market|GB|
El Ateneo Grand Splendid|yenny-elateneo.com|books|AR|
JanSport|jansport.com|indie|US|S|sh
Marantz|marantz.com|tech|JP,US|
Havaianas|havaianas.com.br|shoes|AU,BR|S|sh
Soylent|soylent.com|indie|US|S|sh
Dickies|dickies.com|fashion|US|S|sh
HelloFresh|hellofresh.com|grocery|DE|
Don Quijote|donki.com|dept|JP|
Dollarama|dollarama.com|dept|CA|
ATB-Market|atbmarket.com|grocery|UA|
Rimi Baltic|rimi.lv|grocery|LV|
Heelys|heelys.com|indie|WW|S|sh
Leatherman|leatherman.com|indie|US|S|sh
Cervelo|cervelo.com|auto|CA|S|sh
C. and J. Clark International|clarks.in|shoes|GB|S|sh
Alfred Dunhill|dunhill.com|fashion|GB|
Stussy|stussy.com|dept|US|S|sh
Hostinger|hostinger.com|market|LT|
Bowers and Wilkins|bowerswilkins.com|tech|GB|
Steiff|steiff.com|kids|DE|
Koh-i-Noor Hardtmuth|koh-i-noor.cz|office|CZ|
Jack Wolfskin|jack-wolfskin.com|sport|DE|S|sh
Thermo Fisher Scientific|thermofisher.com|health|US|
Vinmonopolet|vinmonopolet.no|grocery|NO|
Allegro|allegro.hu|market|PL|
Mercator|mercator.si|grocery|SI|
Poundland|poundland.co.uk|dept|GB|S|sh
Trussardi|trussardi.com|fashion|IT|S|sh
Suning.com|suning.com|dept|CN|
REMA 1000|rema.no|grocery|DK,NO,SE|
etnies|etnies.com|shoes|US|S|sh
Vox|voxamps.co.uk|office|GB|S|sh
E Ink|eink.com|indie|WW|
System76|system76.com|tech|US|
Webtoon|webtoons.com|games|WW|
Thor Steinar|thorsteinar.de|fashion|DE|
Deliveroo|deliveroo.co.uk|market|GB|
Roger Dubuis|rogerdubuis.com|jewelry|CH|
Liberty|libertylondon.com|dept|GB|
Daiso|daiso-sangyo.co.jp|dept|JP|
Pingo Doce|pingodoce.pt|grocery|PT|
Migros Ticaret|migros.com.tr|grocery|TR|
Action|action.com|dept|WW|
Wilkinson Sword|wilkinsonsword.com|auto|DE,GB|S|sh
Viktor and Rolf|viktor-rolf.com|fashion|WW|S|sh
Fruit of the Loom|fruit.com|dept|US|
Dilmah|dilmahtea.com|grocery|LK|
Tony's Chocolonely|tonyschocolonely.com|grocery|WW|S|sh
Ben Sherman|bensherman.com|fashion|GB|
Konzum|konzum.hr|grocery|HR|
Etro|etro.com|fashion|IT|
Agatha Ruiz de la Prada|agatharuizdelaprada.com|fashion|WW|S|sh
Moldcell|moldcell.md|tech|MD|
Zwilling J. A. Henckels|zwilling.com|home|DE|
Herman Miller|hermanmiller.com|home|US|
Conad|conad.it|grocery|IT|
Mexx|mexx.com|fashion|WW|S|sh
Brita|brita.net|indie|DE|S|sh
Olay|olay.com|indie|US,ZA|S|sh
S.T. Dupont|st-dupont.com|indie|FR|S|sh
Labello|labello.com|indie|WW|
Maglite|maglite.com|indie|US|S|sh
SK-II|sk-ii.com|beauty|JP|S|sh
Reusch|reusch.com|sport|IT|
Tom Tailor|tom-tailor.com|fashion|DE|
Eroski|eroski.es|grocery|ES|
Nina Ricci|ninaricci.com|fashion|FR|S
Giordano|giordano.com|fashion|CN|
Tiger of Sweden|tigerofsweden.com|dept|GB,SE,US|
100 Thieves|100thieves.com|sport|US|S|sh
Fritz Hansen|fritzhansen.com|home|DK|S|sh
Monster|monsterstore.com|tech|US|S|sh
Animate|animate.co.jp|dept|JP|
Selver|selver.ee|grocery|EE|
Jack and Jones|jackjones.com|fashion|DK|
Sostrene Grene|sostrenegrene.com|home|DK|
Daiei|daiei.co.jp|dept|JP|
Conrad Electronic|conrad.de|tech|DE|
Gay's The Word|gaystheword.co.uk|books|GB|
Armand de Brignac|armanddebrignac.com|indie|FR|
Selters|selters.de|indie|DE|
Febreze|febreze.com|indie|US|
Vicks|vicks.com|indie|US|
Copic|copic.jp|indie|JP|
CoverGirl|covergirl.com|fashion|US|
Alessi|alessi.com|indie|IT|S|sh
Waterford Crystal|waterford.com|indie|IE|S|sh
Cabbage Patch Kids|cabbagepatchkids.com|books|US|S|sh
au|au.com|tech|JP|
s.Oliver|soliver.de|fashion|DE|
Amorepacific|amorepacific.com|beauty|KR|S
KiK|kik.de|fashion|DE|
Book Off|bookoff.co.jp|books|JP|
Camper|camper.com|shoes|ES|
Church's|church-footwear.com|dept|GB,IT|
Blufin|blufin.it|fashion|IT|
Merrell|merrell.com|shoes|US|
Brainly|brainly.pl|market|PL|
Eir|eir.ie|tech|IE|
Yoigo|yoigo.com|tech|ES|
Disney Store|disneystore.com|office|US|
Interflora|interflora.co.uk|office|ES,FR,GB,IT|
Ahlens|ahlens.se|dept|SE|
Lord and Taylor|lordandtaylor.com|dept|US|S|sh
Globus|globus.de|grocery|DE|
Continente|continente.pt|grocery|PT|
Hunkemoller|hunkemoller.be|fashion|WW|
Napapijri|napapijri.com|fashion|CH,IT|S|sh
Furla|furla.com|fashion|IT|
H Mart|hmart.com|grocery|US|
Asprey|asprey.com|dept|GB|S|sh
Artmajeur|artmajeur.com|dept|FR|
City Lights Bookstore|citylights.com|books|US|
Revox|revox.com|tech|CH|S|sh
Hershey's Kisses|hersheyland.com|indie|US|
Duralex|duralex.com|indie|FR|S|sh
Ugreen|ugreen.com|tech|CN|S|sh
Innisfree|innisfree.com|beauty|KR|S|sh
Saregama|saregama.com|indie|IN|
Wolford|wolford.com|fashion|AT|
Johann Maria Farina gegenuber dem Julichs-Platz|farina1709.com|beauty|DE|S|sh
Cerruti 1881|cerruti.com|fashion|FR|S|sh
Lotus's|lotuss.com|grocery|MY,TH|
E. Marinella|emarinella.eu|fashion|IT|S|sh
Sea|sea.com|market|SG|
Doro|doro.com|tech|SE|
Admiral Sports|admiralsports.com|sport|GB|S|sh
VAUDE|vaude.com|sport|DE|
Poggenpohl|poggenpohl.com|home|DE|
Telkom|telkom.co.za|tech|ZA|
Patanjali Ayurved|patanjaliayurved.net|grocery|IN|
Matsuzakaya|matsuzakaya.co.jp|dept|JP|
Wellcome|wellcome.com.hk|grocery|CN,GB|
Bilka|bilka.dk|grocery|DK|
NKD|nkd.it|fashion|DE|
Apoteket|apoteket.se|health|SE|
Gottex|gottex.co.il|fashion|IL|S
FAO Schwarz|faoschwarz.com|kids|US|S|sh
Eataly|eataly.com|grocery|IT,US|
Auntie Anne's|auntieannes.com|dept|US|
Detskiy Mir|detmir.ru|kids|RU|
Eliseyev Emporium|kupetzeliseevs.ru|dept|RU|
Officina di Santa Maria Novella|smnovella.com|health|IT|S|sh
Premier Percussion|premier-percussion.com|office|GB|
Charmin|charmin.com|indie|US|
Thunderdome|thunderdome.com|books|WW|
Lucozade|lucozade.com|indie|GB|
Cerwin-Vega|cerwinvega.com|tech|US|S|sh
Aquafresh|aquafresh.com|indie|WW|
Kalles kaviar|kalles.se|indie|SE|
Air Wick|airwick.us|indie|US|
Anti Social Social Club|antisocialsocialclub.com|fashion|US|S|sh
Meta Portal|metaportalhelp.com|indie|WW|
Finish|finish.fr|indie|US|S
Zooplus|zooplus.es|dept|DE|
Denner|denner.ch|grocery|CH|
Akris|akris.ch|fashion|CH|S|sh
Zellers|zellers.com|dept|CA|S|sh
Creed|creedfragrance.com|beauty|FR|
Circuit City Stores|circuitcity.com|dept|US|
Strauss|strauss.com|fashion|DE|S|sh
WESC|wesc.uk|fashion|SE|S
Turnbull and Asser|turnbullandasser.com|fashion|GB|S|sh
Amouage|amouage.com|beauty|OM|S|sh
Chedraui|chedraui.com.mx|grocery|MX|
Kangol|kangol.com|fashion|GB|S|sh
Evisu|evisu.com|fashion|JP|S|sh
Ermanno Scervino|ermannoscervino.com|fashion|IT|S|sh
Lumene|lumene.com|beauty|FI|S|sh
Ceconomy|ceconomy-mms.com|dept|DE|
Superga|superga.com|shoes|IT|S|sh
Garrard and Co|garrard.com|jewelry|GB|S|sh
Ultimate Ears|ultimateears.com|tech|US|
Edifier|edifier.com|tech|CN|S
Roku|roku.com|tech|US|
Lakme Cosmetics|lakmeindia.com|beauty|IN|S|sh
Bally|bally.com|shoes|CH|S|sh
Cole Haan|colehaan.com|shoes|US|S|sh
Aigle|aigle.com|fashion|FR|
Canali|canali.com|fashion|IT|
Rip Curl|ripcurl.com|fashion|AU|S|sh
Wacoal|wacoal-america.com|fashion|JP|S|sh
Wako|wako.co.jp|dept|JP|
Gekas|gekas.se|dept|SE|
Elkjop|elkjop.no|tech|NO|
Colruyt|colruyt.fr|grocery|BE|
Mulberry|mulberry.com|fashion|GB|
Giant Hypermarket|giant.sg|dept|MY|
Pisiffik|pisiffik.gl|grocery|GL|
Game Digital|game.es|games|GB|
M.video|mvideo.ru|tech|RU|
Sprouts Farmers Market|sprouts.com|grocery|US|
Hot Topic|hottopic.com|fashion|US|
Marithe + Francois Girbaud|girbaud.com|fashion|FR|S|sh
Sport-Saller|sport-saller.de|sport|DE|
Moon Boot|moonboot.com|indie|IT|S|sh
LGB|lgb.com|indie|DE|
Karhu|karhu.com|indie|FI|S|sh
Eucerin|eucerin.ru|indie|DE|
LISTA|lista.com|home|CH|
Schick|schick.com|indie|WW|S|sh
K-Y Jelly|k-y.com|indie|WW|
Mr. Clean|mrclean.com|indie|US|
Sarenza|sarenza.com|market|FR|
Bisleri|bisleri.com|indie|IN|
Ring|ring.com|indie|US|S|sh
Heinz Tomato Ketchup|heinz.com|indie|US|
Libresse|libresse.com|indie|WW|
Onitsuka Tiger|onitsukatiger.com|shoes|JP|
Dr. Scholl's|drscholls.com|shoes|GB,US|S|sh
Philips Hue|philips-hue.com|home|WW|
Ulefone|ulefone.com|indie|CN|S|sh
Juicy Couture|juicycouture.com|beauty|US|S|sh
Sisley|sisley-paris.com|beauty|FR|
Sergio Rossi|sergiorossi.com|luxury|IT|S|sh
2(x)ist|2xist.com|fashion|US|S
BayWa|baywa.com|diy|DE|
Eddie Bauer|eddiebauer.com|fashion|US|S|sh
UNY|uny.co.jp|dept|JP|
Marmot|marmot.com|dept|US|
Independent Truck|independenttrucks.com|dept|US|
Dippin' Dots|dippindots.com|dept|US|
Illums Bolighus|illumsbolighus.no|dept|DK|
Sector No Limits|sectornolimits.com|dept|IT|
Autobacs Seven|autobacs.com|auto|JP|
Viagogo|viagogo.com|market|GB,US|
Carvana|carvana.com|market|US|
Rakuten TV|tv.rakuten.co.jp|market|ES|
OBEY Clothing|obeyclothing.com|fashion|US|S|sh
Red Wing Shoes|redwingshoes.com|shoes|US|
Powell Peralta|powell-peralta.com|sport|US|
Kiwi Norway|kiwi.no|grocery|NO|
Jabra|jabra.com|tech|DK|
Creality|creality.com|tech|CN|
GEEKOM|geekompc.com|tech|CN|
MetalSucks|metalsucks.com|market|US|
Dulux|dulux.co.uk|diy|CA,GB,IN|
Chaumet|chaumet.com|jewelry|FR|S|sh
Picard Surgeles|picard.fr|grocery|FR|
361|361sport.com|fashion|CN|S|sh
Yankee Candle|yankeecandle.com|dept|US|
Tempur-Pedic|tempurpedic.com|home|US|
Magasin du Nord|magasin.dk|dept|DK|
Kintetsu Department Store|d-kintetsu.co.jp|dept|JP|
Steffl Department Store Wien|steffl-vienna.at|dept|AT|S|sh
Zeeman|zeeman.com|fashion|WW|
oodji|oodji.com|fashion|RU|
Phone House|phonehouse.es|tech|ES|
Thorntons|thorntons.co.uk|grocery|GB|
Metro|metro.ca|grocery|CA|
Brico Depot|bricodepot.fr|diy|FR|
Steimatzky|steimatzky.co.il|books|IL|
Club Monaco|clubmonaco.com|fashion|US|S|sh
Bonus|bonus.is|grocery|IS|
Dedeman|dedeman.ro|diy|RO|
Suitsupply|suitsupply.com|fashion|WW|S|sh
Matsuya Foods|matsuyafoods.co.jp|dept|JP|
H. Stern|hstern.com.br|jewelry|BR|
Sterno|sterno.com|indie|WW|S|sh
Renova|myrenova.com|indie|PT|
Poltrona Frau|poltronafrau.com|home|IT|
Silly Bandz|sillybandzonline.com|indie|WW|
Stetson|stetson.com|indie|WW|S|sh
Sea-Doo|sea-doo.brp.com|indie|CA|
American Girl|americangirl.com|kids|US|S|sh
Siam|siam.com.ar|indie|AR|
Bioderma|bioderma.jp|beauty|FR|S|sh
HUION|huion.com|indie|WW|
UMI|umidigi.com|indie|CN|
Thomas Pink|thomaspink.com|fashion|GB|S|sh
TsUM|tsum.ru|dept|RU|
Trent|trentlimited.com|dept|IN|S|sh
Chantelle|chantelle.com|fashion|FR|
Edward Green Shoes|edwardgreen.com|fashion|GB|
J.Lindeberg|jlindebergusa.com|sport|CA,SE,US|S|sh
DAKS|daks.com|fashion|GB|S|sh
Gieves and Hawkes|gievesandhawkes.com|dept|GB|S|sh
Jordache Enterprises|jordache.com|fashion|US|S|sh
Albert Ceska republika|albert.cz|grocery|CZ|
Fitshop|fitshop.de|sport|DE|
Herschel Supply|herschel.com|fashion|CA|S|sh
Rawlings|rawlings.com|sport|US|
Buccellati|buccellati.com|jewelry|IT|
MakerBot|makerbot.com|tech|US|
Electro-Voice|electrovoice.com|tech|US|
Kusmi Tea|kusmitea.com|grocery|FR|S|sh
Salamander|salamander.de|shoes|DE|S|sh
Entel Chile|entel.cl|tech|CL|
Videotron|videotron.com|tech|CA|
Hurley International|hurley.com|fashion|US|S|sh
Army and Air Force Exchange Service|shopmyexchange.com|dept|US|
Hayashi Department Store|hayashi.com.tw|dept|TW|
Matahari Department Store|matahari.com|dept|ID|S|sh
Springfield|myspringfield.com|fashion|ES|
Castro Model|castro.com|fashion|IL|
Winn-Dixie|winndixie.com|grocery|US|
Gina Tricot|ginatricot.com|fashion|SE|
Kathmandu|kathmandu.co.nz|sport|NZ|S|sh
Munich|munichsports.com|shoes|ES|
Ito-Yokado|itoyokado.co.jp|grocery|JP|
Brantano Footwear|brantano.com|shoes|BE|S|sh
Family Dollar|familydollar.com|dept|US|
Mega Image|mega-image.ro|grocery|RO|
QuikTrip|quiktrip.com|grocery|US|
SM Supermalls|smsupermalls.com|dept|PH|
Araz Supermarket|arazmarket.az|grocery|AZ|
JOOP!|joop.com|beauty|DE|
mora|mora.jp|market|JP|
Boomplay|boomplay.com|office|NG|
Bauhaus Center Tel Aviv|bauhaus-center.com|office|IL|
Confeitaria Colombo|confeitariacolombo.com.br|grocery|BR|
Kyobo Book Centre|kyobobook.co.kr|books|KR|
O'Neill|oneill.com|fashion|US|S|sh
Patron|patrontequila.com|grocery|MX,US|
Manic Panic|manic-panic.info|beauty|US|
Irshad|irshad.az|tech|AZ|
R.E.M. Beauty|rembeauty.com|beauty|US|S|sh
Max Brenner|maxbrenner.com|grocery|IL|S
UPIM|upim.com|dept|IT|
Replay|replayjeans.com|fashion|IT|
Nudie Jeans|nudiejeans.com|fashion|SE|
MCS|mcs.com|fashion|IT|S|sh
Henry Poole and Co|henrypoole.com|dept|GB|
Braccialini|braccialini.it|fashion|IT|
Deseret Book|deseretbook.com|dept|US|
CHARLES and KEITH|charleskeith.eu|dept|SG|
Pal Zileri|palzileri.com|fashion|IT|S|sh
Rockport|rockport.com|shoes|US|S|sh
Herve Leger|herveleger.com|fashion|WW|S|sh
Inglot cosmetics|inglot.pl|beauty|PL|
G2000|g2000.com.hk|fashion|CN|S
The Brick|thebrick.com|home|CA|S|sh
XXL Sport and Villmark|xxl.no|sport|NO|
Notino|notino.ua|market|CZ|
Georg Jensen|georgjensen.com|dept|DK|
Bingo supermarket|bingotuzla.ba|grocery|BA|
Food City|foodcity.com|grocery|US|
Fanatics|fanaticsinc.com|fashion|US|
Vipshop|vip.com|market|CN|
Loake|loake.co.uk|dept|GB|
NYX Professional Makeup|nyxcosmetics.de|beauty|US|
Castelli Cycling|castelli-cycling.com|fashion|IT|S|sh
DVS Shoes|dvsshoes.com|shoes|US|S|sh
Blundstone Australia|blundstone.com|shoes|AU|S|sh
Golden Goose|goldengoose.com|shoes|IT|
Bofrost|bofrost.de|grocery|DE|
Roberts Radio|robertsradio.com|tech|GB|S|sh
Witt Weiden|witt-weiden.de|fashion|DE|
Hush Puppies|hushpuppies.com|shoes|AU,US|
Kawasaki|kawasaki.com|auto|WW|
Fido Solutions|fido.ca|tech|CA|
Virgin Plus|virginplus.ca|tech|CA|
Safaricom|safaricom.co.ke|tech|KE|
Teufel Audio|teufel.ch|tech|DE|
Skin Food|theskinfood.com|beauty|KR|
Chevignon|chevignon.fr|fashion|FR|S|sh
Mavi Jeans|mavi.com|fashion|TR|S
Shapeways|shapeways.com|market|US|
Hankyu Department Store|hankyu-dept.co.jp|dept|JP|
Coin|coin.it|home|IT|
Mix Markt|mixmarkt.eu|grocery|DE|
Acme Markets|acmemarkets.com|grocery|US|
WE|wefashion.com|fashion|BE,CH,DE,NL|
Lancel|lancel.com|dept|WW|S|sh
Fix Price|fix-price.com|dept|GE,KZ,RS,RU|
99 Ranch Market|99ranch.com|grocery|ID,US|
ABC Stores|abcstores.com|grocery|US|
Ben's Cookies|benscookies.com|grocery|GB|
Fox-Wizel|fox.co.il|fashion|IL|S|sh
Grocery Outlet|groceryoutlet.com|grocery|US|
Ingles|ingles-markets.com|grocery|US|
Havan|havan.com.br|dept|BR|
Byggmax|byggmax.se|diy|SE|
Meny|meny.dk|grocery|NO|
TWG Tea|twgtea.com|grocery|SG|
Better World Books|betterworldbooks.com|books|US|
Dr. Jart+|drjart.com|market|WW|
Roxy|roxy.fr|fashion|US|
Itoya|ito-ya.co.jp|office|JP|
Freedom Press|freedompress.org.uk|books|GB|
Librairie feministe l'Euguelionne|librairieleuguelionne.com|books|CA|
Category Is Books|categoryisbooks.com|books|GB|
Angelic Pretty|angelicpretty.com|fashion|JP|
Parfois|parfois.com|fashion|PT|
Eveready Battery|eveready.com|tech|US|
Eddy Merckx|eddymerckx.com|auto|BE|
Butlers|butlers.com|home|DE|S|sh
Karl Kani|karlkani.com|fashion|WW|S|sh
idealo|idealo.it|market|DE,ES|
Stefanel|stefanel.com|fashion|IT|
Iceberg|iceberg.com|fashion|IT|
Parfums Caron|parfumscaron.com|beauty|FR|S|sh
Schott NYC|schottnyc.com|fashion|US|S|sh
Avirex|avirex.com|fashion|US|S|sh
Tia|tia.com.ec|dept|CO,EC|
Bossini|bossini.com|fashion|CN|S|sh
Ahava|ahava.com|beauty|IL|S|sh
Bjorn Borg|bjornborg.com|fashion|SE|
Bosideng|bosideng.com|fashion|CN|
Charriol|charriol.com|fashion|CH|S|sh
Floris of London|florislondon.com|beauty|GB|S|sh
Hart Stores|hartstores.com|dept|CA|S|sh
Ports 1961|ports1961.com|fashion|CA|S|sh
Reitmans|reitmans.com|fashion|CA|S|sh
Roots Canada|roots.com|fashion|CA|
Shanghai Tang|shanghaitang.com|fashion|CN|
Zumiez|zumiez.com|fashion|US|
Eisenberg Paris|eisenberg.com|beauty|FR|S|sh
Carousell|carousell.com|market|WW|
Haworth|haworth.com|home|US|S
Borovo|borovo.hr|shoes|HR|
Kalyan Jewellers|kalyanjewellers.net|jewelry|IN|
Lukfook Jewellery|lukfook.com|jewelry|CN|
Joker|joker.no|grocery|NO|
Maxon Effects|maxonfx.com|tech|JP|S|sh
Smart and Final|smartandfinal.com|grocery|US|
Sport-Thieme|sport-thieme.de|market|DE|
Alfa-Beta Vassilopoulos|ab.gr|grocery|GR|
Key Food|keyfood.com|grocery|US|
Stokomani|stokomani.fr|dept|FR|S|sh
TeeGschwendner|teegschwendner.de|grocery|DE|
Benjamin Moore and|benjaminmoore.com|diy|US|
Zlatarna Celje|zlatarnacelje.com|jewelry|SI|
Aaron's|aarons.com|home|US|
Osim International|osim.com|tech|SG|S
Armor Lux|armorlux.com|fashion|FR|S|sh
Laderach|laderach.com|grocery|CH|
Tommy Bahama|tommybahama.com|fashion|US|
Profilo|profilo.com|tech|TR|
Redbubble|redbubble.com|market|AU|
OpenBazaar|openbazaar.org|tech|WW|
Fenwick|fenwick.co.uk|dept|GB|S|sh
T J Hughes|tjhughes.co.uk|dept|GB|S|sh
Illum|illum.dk|dept|DK|
Aveve|aveve.be|diy|BE|
Beter Bed|beterbed.nl|home|BE,NL|
Takko Fashion|takko.com|fashion|DE|
Brico|brico.be|diy|BE|
OKQ8|okq8.se|grocery|SE|
Mauboussin|mauboussin.fr|jewelry|FR|
Kiko Milano|kikocosmetics.com|beauty|IT|S
Liu Jo|liujo.com|fashion|IT|
Ann Taylor|anntaylor.com|fashion|US|
Bebe Stores|bebe.com|fashion|US|S|sh
Bonmarche|bonmarche.co.uk|fashion|GB|
Brookstone|brookstone.com|tech|US|S|sh
Dorothy Perkins|dorothyperkins.com|fashion|GB|
Dreams|dreams.co.uk|home|GB|
Emack and Bolio's|emackandbolios.com|dept|US|
Karkkainen|karkkainen.com|dept|FI|
Farmacias Benavides|benavides.com.mx|health|MX|
Graeter's|graeters.com|dept|US|S|sh
Holland and Barrett|hollandandbarrett.nl|grocery|GB|
Jumbo|jumbo.cl|grocery|AR,CL|
King Kullen|kingkullen.com|grocery|US|
MS Mode|msmode.nl|fashion|WW|
Party City|partycity.com|office|US|S|sh
Rooms To Go|roomstogo.com|home|US|
Suomalainen Kirjakauppa|suomalainen.com|books|FI|S|sh
The Fresh Market|thefreshmarket.com|grocery|US|
Tops Friendly Markets|topsmarkets.com|grocery|US|
Matsumoto Kiyoshi|matsukiyo.hk|health|JP|
Rusta|rusta.com|dept|SE|
Polomarket|polomarket.pl|grocery|PL|
Matalan|matalan.co.uk|fashion|GB|
Tokmanni|tokmanni.fi|dept|FI|
Dealz|dealz.ie|dept|IE|S|sh
Natural Grocers|naturalgrocers.com|grocery|US|
Pierre Cardin|pierrecardin.com|fashion|FR|S|sh
Assai Atacadista|assai.com.br|grocery|BR|
Kuzina|kuzina.ru|dept|RU|
Bimba y Lola|bimbaylola.com|fashion|ES|
VkusVill|vkusvill.ru|grocery|RU|
Studenac Market|studenac.hr|grocery|HR|
ALE-HOP|ale-hop.org|office|ES|
Gudrun Sjoden|gudrunsjoden.com|fashion|SE|
sacai|sacai.jp|fashion|JP|S|sh
A.P.C.|apc.fr|fashion|FR|S|sh
Matieres Fecales|matieresfecales.com|fashion|FR|S
Adlibris|adlibris.com|books|SE|
Juno Records|juno.co.uk|office|GB|
Pfunds Molkerei|pfunds.de|fashion|DE|
Skatepark of Tampa|skateparkoftampa.com|dept|US|S|sh
Truefitt and Hill|truefittandhill.com|dept|GB|S|sh
Ye Olde Curiosity Shop|yeoldecuriosityshop.com|dept|US|
BR Legetoj|br.dk|kids|DK|
Cyberdog|cyberdog.net|dept|GB|S|sh
Consum|consum.es|grocery|ES|
Les Mots a la Bouche|motsbouche.com|books|FR|
Adriatica|adriaticawatches.ch|jewelry|CH|
Pimkie|pimkie.fr|fashion|FR|S|sh
Sandeman|sandeman.com|grocery|ES,PT|S|sh
Lanerossi|lanerossi.com|fashion|IT|S|sh
Cream of Wheat|creamofwheat.com|grocery|US|
FiiO|fiio.com|tech|CN|
Petit Bateau|petit-bateau.com|fashion|FR|
7 for all Mankind|7forallmankind.com|fashion|US|S|sh
Costume National|costumenational.com|fashion|IT|S|sh
Horze|horze.com|dept|FI|S
La Martina|lamartina.com|fashion|AR|S|sh
Caprabo|caprabo.com|grocery|ES|
Alibris|alibris.com|dept|US|
Arnotts|arnotts.ie|dept|IE|
Atacadao|atacadao.com.br|grocery|BR|
Bing Shopping|bing.com|market|WW|
William Rast|williamrast.com|dept|US|
Jean Coutu|jeancoutu.com|dept|CA|
Home Hardware|homehardware.ca|diy|CA|
Lise Watier|watier.com|beauty|CA|S|sh
Oscaro|oscaro.it|market|FR|
Teknikmagasinet|teknikmagasinet.se|tech|SE|
Ferrino|ferrino.it|dept|IT|
Scarpa|scarpa.com|shoes|IT|S|sh
Bealls|beallsinc.com|dept|US|
Armedangels|armedangels.co.uk|fashion|GB|S|sh
Dangdang|dangdang.com|dept|CN|
David Koma|davidkoma.com|fashion|GB|S|sh
Chrome Hearts|chromehearts.com|fashion|US|
Colcci|colcci.com.br|fashion|BR|
Hickey Freeman|hickeyfreeman.com|dept|US|
Giant Tiger|gianttiger.com|dept|CA|S|sh
Hang Ten|hangten.com|dept|WW|S|sh
Moscot|moscot.com|dept|US|S|sh
Mountain Warehouse|mountainwarehouse.com|sport|GB|
Peacocks|peacocks.co.uk|fashion|GB|
Princess Auto|princessauto.com|diy|CA|
Total Wine and More|totalwine.com|grocery|US|
Happy Socks|happysocks.com|fashion|SE|
New Yaohan|newyaohan.com|dept|CN|
K-Books|k-books.co.jp|dept|JP|
OPI Products|opi.com|beauty|US|
Hardy Brothers|hardybrothers.com.au|dept|AU|S|sh
HomeSense|homesense.ie|home|CA|
Molton Brown|moltonbrown.co.uk|beauty|GB|
The Honest|honest.com|dept|US|S|sh
Ronald van der Kemp|ronaldvanderkemp.com|fashion|WW|
Brugseni|brugseni.gl|grocery|GL|
Shopbop|shopbop.com|dept|US|
Scalpers|scalperscompany.com|dept|ES|S|sh
Yeezy|yeezy.com|shoes|US|
Parfums de Marly|parfums-de-marly.com|beauty|FR|S|sh
Flink|goflink.com|market|WW|
Wartski|wartski.com|jewelry|GB|
Coolblue|coolblue.de|tech|BE,DE|
Coby Electronics|cobyusa.com|tech|US|S|sh
Onida Electronics|onida.com|tech|IN|
Formlabs|formlabs.com|tech|US|
DXN|dxn2u.com|beauty|MY|
Paris Store|paris-store.com|grocery|FR|
Carulla|carulla.com|grocery|CO|
Citistore|citistore.com.hk|dept|CN|
DavidsTea|davidstea.com|grocery|CA|S|sh
Humanic|humanic.net|shoes|AT|
Steve Madden|stevemadden.com|shoes|US|S|sh
Fissler|fissler.com|home|DE|S|sh
KKTC Telsim|kktctelsim.com|tech|CY|
One NZ|one.nz|tech|NZ|
Eu Yan Sang|euyansang.com|dept|MY|S|sh
Ligne Roset|ligne-roset.com|home|FR|
Gigantti|gigantti.fi|tech|FI|
Sa Sa International|sasa.com|beauty|CN|S|sh
Calida|calida.com|fashion|CH|
FALKE|falke.com|fashion|DE|
Kookai|kookai.fr|fashion|FR|S|sh
North Sails|northsails.com|fashion|US|S|sh
Izod|izod.com|fashion|US|S|sh
Salsa Jeans|salsajeans.com|fashion|PT|
Van Laack|vanlaack.com|fashion|DE|
T. M. Lewin|tmlewin.co.uk|fashion|GB|S|sh
Sleep Number|sleepnumber.com|home|US|
Vera Bradley|verabradley.com|fashion|US|S|sh
rover.com|rover.com|pets|WW|
CGTrader|cgtrader.com|market|LT|
Spotahome|spotahome.com|market|ES|
Haizol|haizol.com|market|CN|
Anger 1|anger1erfurt.de|dept|DE|
Kaufhaus Tyrol|kaufhaus-tyrol.at|dept|AT|
Carson's|carsons.com|dept|US|S|sh
Morleys Stores|morleys.co.uk|dept|GB|S|sh
Stein Mart|steinmart.com|dept|US|S|sh
Boyes|boyes.co.uk|dept|GB|
Panduro Hobby|panduro.com|office|SE|
MPreis|mpreis.at|grocery|AT|
Libreria Porrua|porrua.mx|books|MX|
Budnikowsky|budni.de|health|DE|
Delhaize|delhaize.be|grocery|BE|
Hagebau|hagebau.com|diy|DE|
Louis Motorcycle|louis.de|auto|DE|
Lottusse|lottusse.com|shoes|ES|
See's Candies|sees.com|grocery|US|
Smyk|smyk.com|kids|PL|
Praxis|praxis.nl|diy|NL|
Archambault|archambault.ca|dept|CA|
Champs Sports|champssports.com|sport|US|
Eason and Son|easons.com|books|IE|
Hubo Belgium|hubo.be|diy|BE|
Uwajimaya|uwajimaya.com|grocery|US|S
Promod|promod.com|fashion|FR|
Angus and Robertson|angusrobertson.com.au|books|AU|
DA|da.nl|health|NL|
Silvan|silvan.dk|diy|DK|
Carpetright|carpetright.nl|home|GB|S|sh
Hubo Netherlands|hubo.nl|diy|NL|S|sh
Penshoppe|penshoppe.com|fashion|PH|S|sh
Lee's Famous Recipe Chicken|leesfamousrecipe.com|dept|US|
M and M Food Market|mmfoodmarket.com|grocery|CA|S|sh
Ollie's Bargain Outlet|ollies.com|dept|US|S|sh
Oxfam bookshops|oxfam.org.uk|books|GB|
P. C. Richard and Son|pcrichard.com|tech|US|
Pier 1 Imports|pier1.com|market|US|S
Plaza Vea|plazavea.com.pe|grocery|PE|
Poundstretcher|poundstretcher.co.uk|dept|GB|S|sh
Robert Dyas|robertdyas.co.uk|diy|GB|
Stanfords|stanfords.co.uk|books|GB|
Vons|vons.com|grocery|US|
Yurindo|yurindo.co.jp|books|JP|
West Marine|westmarine.com|dept|US|
Regatta|regatta.com|sport|GB|
Yliopiston Apteekki|yliopistonapteekki.fi|health|FI|
Mikimoto|mikimoto.com|jewelry|JP|
Asko|asko.fi|home|FI|
Veganz|veganz.de|grocery|DE|
Allo|allo.ua|tech|UA|
Puuilo|puuilo.fi|diy|FI|
Sotka|sotka.fi|home|FI|
T2|t2tea.com|grocery|AU|S|sh
Hipermaxi|hipermaxi.com|grocery|BO|
Renuar|renuar.co.il|fashion|IL|S|sh
Obs|obs.no|grocery|NO|
Supermercados El Dorado|eldorado.com.uy|diy|UY|
AlphaMega|alphamega.com.cy|grocery|CY|
vidaXL|vidaxl.de|market|DE|
Books|books.com.tw|market|TW|
Uzum|uzum.uz|market|UZ|
J. W. Pepper and Son|jwpepper.com|dept|US|
Honest Jon's|honestjons.com|books|GB|
Geo. F. Trumper|trumpers.com|dept|GB|
Glad Day Bookshop|gladday.ca|books|CA|
Jack Rabbit Trading Post|jackrabbittradingpost.com|grocery|US|
James Lock and|lockhatters.com|dept|GB|S|sh
ROSE Bikes|rosebikes.de|auto|DE|
H. Huntsman and Sons|huntsmansavilerow.com|fashion|GB|S|sh
The Bathroom Showroom|bathrooms.com|dept|GB|S|sh
Tsuen Tea|tsuentea.ca|grocery|JP|
Picnic|picnic.app|grocery|WW|
Biblio-Globus|biblio-globus.ru|books|RU|
National Book Store|nationalbookstore.com|books|PH|S|sh
Violette and Co|violetteandco.com|books|FR|
Gray-Nicolls|gray-nicolls.co.uk|sport|GB|S|sh
La Vie Claire|lavieclaire.com|grocery|FR|
Avia|avia.com|fashion|US|S|sh
Julius Keilwerth|julius-keilwerth.com|office|DE|
Tern Bicycles|ternbicycles.com|auto|TW|
Which?|which.co.uk|books|GB|
ASUSTOR|asustor.com|tech|TW|
Cimalp|cimalp.com|fashion|FR|S|sh
Bijou Brigitte|bijou-brigitte.com|jewelry|DE|
Bonia|bonia.com|fashion|MY|S|sh
Sears Mexico|sears.com.mx|dept|MX|
Trudon|trudon.com|beauty|FR|
Combi|combi.de|grocery|DE|
Euroflorist|euroflorist.se|dept|SE|
Sierra Springs|sierrasprings.com|dept|US|
Frederick's of Hollywood|fredericks.com|dept|US|S|sh
NHS|nhs-inc.com|dept|US|
Wine-Searcher|wine-searcher.com|market|NZ|
Manufactum|manufactum.de|dept|DE|
Parfums Lubin|lubin.eu|beauty|FR|S|sh
Schiesser|schiesser.com|fashion|DE|
Alaska Commercial|alaskacommercial.com|dept|WW|
Wicked Weasel|wickedweasel.com|dept|AU|S|sh
Brunet|brunet.ca|dept|CA|
Maxeda|maxeda.nl|dept|NL|
Liligo.com|liligo.com|market|FR|
Victorio and Lucchino|victorioylucchino.com|fashion|ES|
claro fair trade|claro.ch|dept|CH|S|sh
Gattinoni|gattinoni.com|fashion|IT|S|sh
Harmont and Blaine|harmontblaine.com|fashion|IT|
Bosco di Ciliegi|bosco.ru|dept|RU|
Ackermans|ackermans.co.za|fashion|ZA|S|sh
Amigo Supermarkets|amigo.com|grocery|US|
Bodybuilding.com|bodybuilding.com|market|US|S|sh
Buckle|buckle.com|fashion|US|
ILVA|ilva.dk|dept|DK|S|sh
Cotton Traders|cottontraders.com|fashion|GB|
Digital River|digitalriver.com|market|US|
Coogi|coogi.com|fashion|AU,US|S|sh
Ella Bache|ellabache.com|beauty|FR|
e.l.f. Cosmetics|elfcosmetics.com|beauty|US|S
Harris Scarfe|harrisscarfe.com.au|dept|AU|
Gus Mayer Stores|gusmayer.com|dept|US|S|sh
Yemeksepeti.com|yemeksepeti.com|market|TR|
`;

function build() {
  const out = [];
  for (const line of DATA.split('\n')) {
    const s = line.trim(); if (!s) continue;
    const [name, domain, cat, countries, search, flags] = s.split('|').map(x => (x || '').trim());
    const st = { name, domain, cat, countries: countries ? countries.split(',') : ['WW'], search: search === 'S' ? '/search?q={q}' : search || '' };
    if (flags === 'sh') st.shopify = true;
    out.push(st);
  }
  return out;
}
const STORES = build();
const CAT_IDS = new Set(CATEGORIES.map(c => c[0]));

// the host part of a directory domain ("etsy.com/c/craft" -> "etsy.com")
const hostOf = (d) => String(d || '').split('/')[0].toLowerCase();
// where to open a store: its own home page
const homeURL = (s) => {
  const host = hostOf(s.domain), rest = String(s.domain).slice(host.length);
  const p = host.split('.'), bare = p.length === 2 || (p.length === 3 && /^(co|com|org|net|ne|or)$/.test(p[1]) && p[2].length === 2);
  return 'https://' + (bare ? 'www.' : '') + host + (rest || '/');
};
// the store's own search results for q, or a web search limited to that store
function searchURL(s, q, engine = 'web') {
  const enc = encodeURIComponent(String(q || '').trim());
  if (s.search) {
    const host = homeURL({ domain: hostOf(s.domain) }).replace(/\/$/, '');
    return host + s.search.replace('{q}', s.search.includes('wholesale-') || s.search.includes('/pdsearch/') ? enc.replace(/%20/g, '-') : enc);
  }
  return webSearchURL(`site:${s.domain} ${q}`, engine);
}
const ENGINES = {
  google: { name: 'Google Shopping', url: 'https://www.google.com/search?tbm=shop&q={q}', web: 'https://www.google.com/search?q={q}' },
  bing: { name: 'Bing Shopping', url: 'https://www.bing.com/shop?q={q}', web: 'https://www.bing.com/search?q={q}' },
  duck: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}&ia=shopping', web: 'https://duckduckgo.com/?q={q}' },
};
function webSearchURL(q, engine = 'google') { const e = ENGINES[engine] || ENGINES.google; return e.web.replace('{q}', encodeURIComponent(q)); }
function productSearchURL(q, engine = 'google') { const e = ENGINES[engine] || ENGINES.google; return e.url.replace('{q}', encodeURIComponent(q)); }

// "nike.com", "https://www.zara.com/us/", "shop at uniqlo dot com" -> a URL to open (null when it is not a site)
function anyStoreURL(input) {
  let s = String(input || '').trim();
  if (!s || /\s/.test(s.replace(/^https?:\/\//i, '').split('/')[0])) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname) && u.hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}
function findByHost(host) {
  host = String(host || '').toLowerCase().replace(/^www\./, '');
  return STORES.find(s => hostOf(s.domain) === host && !s.domain.includes('/')) || STORES.find(s => host.endsWith('.' + hostOf(s.domain))) || null;
}
// directory search: name and domain, best first
function find(q, { cat = '', country = '' } = {}) {
  const t = String(q || '').toLowerCase().replace(/[^a-z0-9 .]/g, '').trim();
  let list = STORES;
  if (cat) list = list.filter(s => s.cat === cat);
  if (country) list = list.filter(s => s.countries.includes(country) || s.countries.includes('WW'));
  if (!t) return list;
  const score = (s) => {
    const n = s.name.toLowerCase().replace(/[^a-z0-9 .]/g, ''), d = s.domain.toLowerCase();
    if (n === t || hostOf(d).split('.')[0] === t) return 0;
    if (n.startsWith(t) || d.startsWith(t)) return 1;
    if (n.split(' ').some(w => w.startsWith(t))) return 2;
    if (n.includes(t) || d.includes(t)) return 3;
    return 9;
  };
  return list.map(s => [score(s), s]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}

module.exports = { STORES, CATEGORIES, COUNTRIES, CAT_IDS, ENGINES, hostOf, homeURL, searchURL, webSearchURL, productSearchURL, anyStoreURL, findByHost, find };

    M['stores'] = module.exports;
  })();
  (function () {
    const module = { exports: {} }, exports = module.exports, require = req;
'use strict';
// Price tracking: what a fresh look at a saved product means. Pure, so it is tested without Electron.
// A saved item: { id, name, url, image, store, price, currency, availability, history: [{ t, p, a }], low, high, first, ... }

const HISTORY_MAX = 180;
const DAY = 864e5;

// how much cheaper is "now" than "was", in percent (0 when it is not cheaper)
function dropPct(was, now) {
  if (!(was > 0) || !(now >= 0) || now >= was) return 0;
  return Math.round((was - now) / was * 1000) / 10;
}

// A fresh reading { price, currency, availability } for a saved item, at time t.
// Returns { item, events } where events are { kind: 'drop', from, to, pct } and { kind: 'back' } (back in stock).
// A drop counts when the price falls at least minPct below the last price we saw (and the currency did not change);
// a new reading goes into the history when the price or stock changed, or once a day so the sparkline keeps time.
function apply(item, fresh, t = Date.now(), { minPct = 1 } = {}) {
  const it = { ...item, history: [...(item.history || [])] };
  const events = [];
  if (!fresh) return { item: { ...it, checked: t, lastError: 'Could not read the page' }, events };
  if (!it.image && fresh.image) it.image = fresh.image; // a saved item without a picture picks one up on its next check
  const price = typeof fresh.price === 'number' && Number.isFinite(fresh.price) ? fresh.price : null;
  const avail = fresh.availability || 'unknown';
  const sameCur = !fresh.currency || !it.currency || fresh.currency === it.currency;
  const before = typeof it.price === 'number' ? it.price : null;
  if (price != null && before != null && sameCur) {
    const pct = dropPct(before, price);
    if (pct >= minPct) events.push({ kind: 'drop', from: before, to: price, pct });
  }
  if (it.availability === 'out' && (avail === 'in' || avail === 'pre')) events.push({ kind: 'back' });
  const last = it.history[it.history.length - 1];
  if (price != null && (!last || last.p !== price || last.a !== avail || t - last.t > DAY * 0.8)) it.history.push({ t, p: price, a: avail });
  if (it.history.length > HISTORY_MAX) it.history = it.history.slice(-HISTORY_MAX);
  if (price != null) {
    it.price = price;
    if (fresh.currency) it.currency = fresh.currency;
    it.low = it.low == null ? price : Math.min(it.low, price);
    it.high = it.high == null ? price : Math.max(it.high, price);
    if (it.first == null) it.first = price;
  }
  if (avail !== 'unknown') it.availability = avail;
  it.checked = t; delete it.lastError;
  if (events.some(e => e.kind === 'drop')) it.droppedAt = t;
  return { item: it, events };
}

// a new item from a product read off a page
function fromProduct(p, { id, store = '', t = Date.now(), collection = '' } = {}) {
  const price = typeof p.price === 'number' ? p.price : null;
  return {
    id: id || 's' + t.toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(p.name || '').slice(0, 160), url: p.url, image: p.image || '', brand: p.brand || '', store,
    price, currency: p.currency || '', availability: p.availability || 'unknown',
    first: price, low: price, high: price, history: price != null ? [{ t, p: price, a: p.availability || 'unknown' }] : [],
    added: t, checked: t, collection, notify: true,
  };
}

// the item's current story: down from the most it cost while saved, or from the price it had when saved
function trend(it) {
  const hist = (it.history || []).map(h => h.p).filter(p => typeof p === 'number');
  if (!hist.length || it.price == null) return { dir: 'flat', pct: 0 };
  const ref = it.first != null ? it.first : hist[0];
  if (it.price < ref) return { dir: 'down', pct: dropPct(ref, it.price), from: ref };
  if (it.price > ref) return { dir: 'up', pct: Math.round((it.price - ref) / ref * 1000) / 10, from: ref };
  return { dir: 'flat', pct: 0, from: ref };
}

// which saved items are due a check
function due(items, t = Date.now(), everyMs = 6 * 3600e3) {
  return items.filter(i => i.url && i.notify !== false && t - (i.checked || 0) >= everyMs * 0.95);
}

// the points for a small sparkline: [[x, y]] in a w x h box
function spark(history, w = 120, h = 32, pad = 3) {
  const pts = (history || []).filter(x => typeof x.p === 'number');
  if (!pts.length) return [];
  if (pts.length === 1) return [[pad, h / 2], [w - pad, h / 2]];
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const lo = Math.min(...pts.map(x => x.p)), hi = Math.max(...pts.map(x => x.p));
  return pts.map(x => [
    Math.round((pad + (w - 2 * pad) * ((x.t - t0) / Math.max(1, t1 - t0))) * 10) / 10,
    Math.round((hi === lo ? h / 2 : pad + (h - 2 * pad) * (1 - (x.p - lo) / (hi - lo))) * 10) / 10,
  ]);
}

module.exports = { apply, fromProduct, trend, due, dropPct, spark, HISTORY_MAX };

    M['prices'] = module.exports;
  })();
  (function () {
    const module = { exports: {} }, exports = module.exports, require = req;
'use strict';
// Orders and parcels: one entry per parcel (or per order until it has a tracking number).
// Pure functions over a list, so the merging and the timeline are tested without Electron.
// An entry: { id, name, shop, host, orderNo, url, items, number, carrier, link, status, statusText, eta,
//             events: [{ t, status, text }], added, checked, delivered, archived, source }
const C = require('./carriers');

const uid = () => 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const MAX = 300;

function view(o) {
  return { ...o, carrierName: o.number ? C.carrierName(o.carrier) : '', step: C.stepIndex(o.status), open: openURL(o), track: o.number ? C.trackURL(o) : '' };
}
// the page that best answers "where is it": a tracking link you gave, the carrier's page, then the shop's order page
const openURL = (o) => o.link || (o.number ? C.trackURL(o) : '') || o.url || '';

// add (or merge into an existing entry) a parcel or order. Returns { list, entry, added }
function add(list, input, t = Date.now()) {
  const number = C.clean(input.number || '');
  const link = /^https?:\/\//i.test(String(input.link || '')) ? String(input.link) : '';
  const orderNo = String(input.orderNo || '').slice(0, 40), host = String(input.host || '').replace(/^www\./, '');
  if (!number && !link && !(orderNo && host) && !input.url) return { list, entry: null, added: false };
  const same = list.find(o => (number && o.number === number)
    || (!number && orderNo && o.orderNo === orderNo && o.host === host)
    || (number && !o.number && orderNo && o.orderNo === orderNo && o.host === host)
    || (!number && !orderNo && input.url && o.url === input.url));
  if (same) {
    const e = { ...same };
    if (number && !e.number) { e.number = number; e.carrier = C.CARRIERS[input.carrier] ? input.carrier : C.detect(number); }
    if (link && !e.link) e.link = link;
    if (input.url && !e.url) e.url = input.url;
    if (orderNo && !e.orderNo) e.orderNo = orderNo;
    if (input.items && input.items.length && !(e.items || []).length) e.items = input.items;
    if (input.name && (e.autoName || e.source === 'auto' || !e.name) && input.source !== 'auto') { e.name = String(input.name).slice(0, 80); delete e.autoName; }
    if (input.carrier && C.CARRIERS[input.carrier] && input.source !== 'auto') e.carrier = input.carrier;
    if (e.archived && input.source === 'manual') e.archived = false;
    return { list: list.map(o => (o.id === e.id ? e : o)), entry: e, added: false };
  }
  const shop = input.shop || (host ? C.shopName(host) : '');
  const st = input.status && input.status.status ? input.status : { status: 'placed', text: number ? 'Waiting for news' : 'Order placed' };
  const e = {
    id: uid(), name: String(input.name || (input.items && input.items[0] && input.items[0].name) || (shop ? 'Order from ' + shop : number ? 'Parcel ' + number : 'Order')).slice(0, 80),
    ...(input.name ? {} : { autoName: true }), shop, host, orderNo, url: input.url || '', items: (input.items || []).slice(0, 12),
    number, carrier: number ? (C.CARRIERS[input.carrier] ? input.carrier : C.detect(number)) : '', link,
    status: st.status, statusText: st.text, eta: input.eta || '', events: [{ t, status: st.status, text: st.text }],
    added: t, checked: 0, delivered: st.status === 'delivered' ? t : 0, archived: false, source: input.source || 'manual',
  };
  return { list: [e, ...list].slice(0, MAX), entry: e, added: true };
}

// a fresh status read for an entry; returns { entry, changed }. Steps never go backwards on a vague page
// (a carrier page that only says "label created" after "out for delivery" is old news), except to say it was delivered.
function setStatus(e, st, text = '', t = Date.now()) {
  const n = { ...e, checked: t, events: [...(e.events || [])] };
  if (text) { const eta = C.etaOf(text); if (eta) n.eta = eta; }
  if (!st) return { entry: n, changed: false };
  const was = C.stepIndex(e.status), now = C.stepIndex(st.status);
  if (now < was) return { entry: n, changed: false };
  const changed = st.status !== e.status || (st.text && st.text !== e.statusText && now > was);
  n.status = st.status; n.statusText = st.text || n.statusText;
  if (changed) n.events.push({ t, status: st.status, text: st.text });
  if (st.status === 'delivered' && !n.delivered) n.delivered = t;
  return { entry: n, changed };
}

// arriving soonest first: out for delivery, then on the way, then ordered; delivered and archived last
function sorted(list) {
  const rank = (o) => (o.archived ? 9 : o.status === 'delivered' ? 5 : 3 - C.stepIndex(o.status));
  return [...list].sort((a, b) => rank(a) - rank(b) || (b.added - a.added));
}
const active = (list) => list.filter(o => !o.archived && o.status !== 'delivered');
// delivered parcels move to the archive by themselves a few days later
function autoArchive(list, t = Date.now(), days = 3) {
  let n = 0;
  const out = list.map(o => (!o.archived && o.status === 'delivered' && o.delivered && t - o.delivered > days * 864e5 ? (n++, { ...o, archived: true }) : o));
  return { list: out, moved: n };
}
const due = (list, t = Date.now(), everyMs = 2 * 3600e3) => list.filter(o => !o.archived && o.status !== 'delivered' && openURL(o) && t - (o.checked || 0) >= everyMs * 0.95);

module.exports = { add, setStatus, sorted, active, autoArchive, due, view, openURL };

    M['orders'] = module.exports;
  })();
  window.DROP_SKIP = ["armedangels.co.uk", "balmain.com", "benetton.com", "brita.net", "burton.com", "chaumet.com", "dickies.com", "diptyqueparis.com", "evisu.com", "headandshoulders.com", "innisfree.com", "jack-wolfskin.com", "jansport.com", "kikki-k.com", "moonboot.com", "napapijri.com", "ollies.us", "revox.com", "ring.com", "ruggable.com", "sandeman.com", "showpo.com", "steffl-vienna.at", "strauss.com", "suitsupply.com", "thehalara.com", "vive.com", "wob.com"]; // Shopify stores that redirect: a browser cannot follow those across sites
  window.DropLib = M;
  window.DROP_VERSION = "1.6.0";
  window.DROP_LOGOS = ["100thieves.com","11st.co.kr","1800contacts.com","1mg.com","24h.pchome.com.tw","2xist.com","361sport.com","7-eleven.com","7forallmankind.com","99ranch.com","aarons.com","ab.gr","abcstores.com","abebooks.com","abercrombie.com","aboutyou.com","abt-sportsline.de","academy.com","acehardware.com","ackermans.co.za","acmemarkets.com","action.com","adafruit.com","adairs.com.au","adidas.com","adlibris.com","admiralsports.com","adorama.com","adorebeauty.com.au","adriaticawatches.ch","advanceautoparts.com","ae.com","aeon.com","aesop.com","agatharuizdelaprada.com","ah.nl","ahava.com","ahlens.se","aigle.com","airwick.us","ajio.com","akris.ch","alange-soehne.com","alaskacommercial.com","albert.cz","albertsons.com","aldi.com","ale-hop.org","alessi.com","alibaba.com","alibris.com","aliexpress.com","allbirds.com","allegro.hu","allegro.pl","allmodern.com","allo.ua","allsaints.com","aloyoga.com","alphamega.com.cy","alza.cz","amazon.ae","amazon.ca","amazon.co.jp","amazon.co.uk","amazon.com.au","amazon.com.br","amazon.com.mx","amazon.com.tr","amazon.com","amazon.de","amazon.eg","amazon.es","amazon.fr","amazon.in","amazon.it","amazon.nl","amazon.pl","amazon.sa","amazon.se","amazon.sg","americanas.com.br","americangirl.com","amigo.com","amoeba.com","amorepacific.com","amouage.com","anacondastores.com","analuisa.com","angelicpretty.com","anger1erfurt.de","angusrobertson.com.au","animate.co.jp","anker.com","anntaylor.com","anta.com","anthropologie.com","antisocialsocialclub.com","ao.com","apc.fr","apollopharmacy.in","apoteket.se","apple.com","aquafresh.com","arazmarket.az","archambault.ca","arcteryx.com","argos.co.uk","arhaus.com","aritzia.com","arket.com","armanddebrignac.com","armedangels.co.uk","armorlux.com","arnotts.ie","arri.com","article.com","artmajeur.com","asda.com","ashleyfurniture.com","asics.com","asko.fi","asos.com","asprey.com","assai.com.br","astridandmiyu.com","asus.com","asustor.com","atacadao.com.br","atbmarket.com","athleta.gap.com","athome.com","atu.de","au.com","auchan.fr","audible.com","auntieannes.com","autobacs.com","autodoc.co.uk","autodoc.de","autozone.com","aveve.be","avia.com","avirex.com","avito.ru","awaytravel.com","babylist.com","backcountry.com","backmarket.com","balenciaga.com","bally.com","balmain.com","bananarepublic.gap.com","bandcamp.com","bang-olufsen.com","banggood.com","barbour.com","barkbox.com","barnesandnoble.com","basspro.com","bathandbodyworks.com","bathrooms.com","bauhaus-center.com","bauhaus.info","baywa.com","beallsinc.com","bearaby.com","beatport.com","beatsbydre.com","beautybay.com","bebe.com","bedbathandbeyond.com","belk.com","belkin.com","bellroy.com","benavides.com.mx","benetton.com","benjaminmoore.com","benscookies.com","bensherman.com","bergfreunde.de","bergzeit.de","bershka.com","bestbuy.ca","bestbuy.com","beterbed.nl","betterworldbooks.com","bhphotovideo.com","biblio-globus.ru","biccamera.com","bigbasket.com","biglots.com","bigw.com.au","bijou-brigitte.com","bike-discount.de","bike24.com","bilka.dk","billa.at","bimbaylola.com","bing.com","bingotuzla.ba","bioderma.jp","birkenstock.com","bisleri.com","bjornborg.com","bjs.com","blackwells.co.uk","blibli.com","blinkit.com","bloomingdales.com","bluebottlecoffee.com","bluenile.com","blufin.it","blundstone.com","boden.com","bodybuilding.com","bofrost.de","bol.com","bombas.com","bonia.com","bonmarche.co.uk","bonus.is","boohoo.com","bookoff.co.jp","books.com.tw","booksamillion.com","bookshop.org","booktopia.com.au","boomplay.com","boots.com","borovo.hr","bosco.ru","bose.com","bosideng.com","bossini.com","bottegaveneta.com","bowerswilkins.com","box.co.uk","boyes.co.uk","br.dk","braccialini.it","brainly.pl","brantano.com","braun.com","breitling.com","breuninger.com","breville.com","brico.be","bricodepot.fr","brightland.co","brilliantearth.com","brita.net","brompton.com","brooklinen.com","brooklyntea.com","brooksrunning.com","brookstone.com","brownthomas.com","brugseni.gl","brunet.ca","buccellati.com","buckle.com","budni.de","buildabear.com","bunnings.com.au","burberry.com","burlington.com","burrow.com","burton.com","butlers.com","buybuybaby.com","byggmax.se","byredo.com","c-and-a.com","cabbagepatchkids.com","cabelas.com","calida.com","calvinklein.us","calzedonia.com","camper.com","canadacomputers.com","canadagoose.com","canadiantire.ca","canali.com","cannondale.com","canyon.com","caprabo.com","caratlane.com","carawayhome.com","carousell.com","carpetright.nl","carrefour.com","carrefour.fr","carrefouruae.com","carsons.com","carters.com","cartier.com","carulla.com","carvana.com","casadellibro.com","casasbahia.com.br","casetify.com","casio.com","casper.com","cassart.co.uk","castelli-cycling.com","castorama.fr","castore.com","castro.com","categoryisbooks.com","cb2.com","cdiscount.com","cdon.se","ceconomy-mms.com","ceneo.pl","centrepointstores.com","cerruti.com","cervelo.com","cerwinvega.com","cgtrader.com","chainreactioncycles.com","challenger.sg","champion.com","champssports.com","chanel.com","chantelle.com","charleskeith.eu","charlottetilbury.com","charmin.com","charriol.com","chaumet.com","checkers.co.za","chedraui.com.mx","chemistwarehouse.com.au","chevignon.fr","chewy.com","childrensplace.com","chloe.com","chopard.de","chowtaifook.com","christ.de","chromehearts.com","chrono24.com","chubbiesshorts.com","church-footwear.com","cimalp.com","circuitcity.com","citistore.com.hk","citylights.com","clarks.com","clarks.in","claro.ch","clinique.com","clubmonaco.com","coach.com","cobyusa.com","coin.it","colcci.com.br","colehaan.com","coles.com.au","colourpop.com","colruyt.fr","columbia.com","combi.de","competitivecyclist.com","conad.it","confeitariacolombo.com.br","conrad.de","consum.es","continente.pt","converse.com","coogi.com","coolblue.de","coolblue.nl","coop.ch","copic.jp","coppel.com","corsair.com","cos.com","costco.ca","costco.co.uk","costco.com","costumenational.com","cotswoldoutdoor.com","cottonon.com","cottontraders.com","countryroad.com.au","coupang.com","courts.com.sg","covergirl.com","craigslist.org","crateandbarrel.com","creality.com","creamofwheat.com","creedfragrance.com","cricut.com","criterion.com","crocs.com","croma.com","crutchfield.com","cultbeauty.co.uk","currys.co.uk","cuyana.com","cvs.com","cyberdog.net","cyberport.de","d-kintetsu.co.jp","da.nl","dafiti.com.br","daiei.co.jp","daiso-sangyo.co.jp","daks.com","dangdang.com","danielwellington.com","daraz.com.bd","daraz.pk","darty.com","davidjones.com","davidkoma.com","davidstea.com","dbrand.com","dealz.ie","deathwishcoffee.com","debenhams.com","debijenkorf.nl","decathlon.com","decitre.fr","dedeman.ro","deere.com","defacto.com","deichmann.com","delhaize.be","deliveroo.co.uk","dell.com","denner.ch","depop.com","dermstore.com","deseretbook.com","desigual.com","detmir.ru","dewalt.com","dhgate.com","dickblick.com","dickies.com","dickssportinggoods.com","digitalriver.com","digitec.ch","dillards.com","dilmahtea.com","dior.com","dippindots.com","diptyqueparis.com","discogs.com","disneystore.com","diy.com","dkny.com","dm.de","docmorris.de","dolcegabbana.com","dollarama.com","dollargeneral.com","dollarshaveclub.com","dollartree.com","donki.com","doro.com","dorothyperkins.com","douglas.de","dreams.co.uk","drinkolipop.com","drinkprime.uk","drjart.com","drmartens.com","drscholls.com","drunkelephant.com","dsw.com","dulux.co.uk","dunelm.com","dunhill.com","dunnesstores.com","duralex.com","dvsshoes.com","dwr.com","dxn2u.com","dymocks.com.au","dyson.com","e.leclerc","easons.com","eataly.com","eatfishwife.com","ebay.ca","ebay.co.uk","ebay.com.au","ebay.com","ebay.de","ebay.fr","ebay.it","ebgames.com.au","eddiebauer.com","eddymerckx.com","edeka.de","edifier.com","edwardgreen.com","eink.com","eir.ie","eisenberg.com","elcorteingles.es","eldorado.com.uy","electronics.sony.com","electrovoice.com","elfcosmetics.com","elgato.com","elgiganten.se","elkjop.no","ellabache.com","emackandbolios.com","emag.ro","emarinella.eu","emma-sleep.com","empik.com","endclothing.com","entel.cl","eprice.it","ermannoscervino.com","eroski.es","errea.com","es.wallapop.com","escada.com","esprit.com","esselunga.it","esteelauder.com","etnies.com","etro.com","etsy.com","eucerin.ru","eurocarparts.com","euroflorist.se","euyansang.com","evanscycles.com","eveready.com","everlane.com","evisu.com","express.com","extra.com","facebook.com","fairprice.com.sg","falabella.com","falke.com","familydollar.com","famousfootwear.com","fanatical.com","fanaticsinc.com","faoschwarz.com","farfetch.com","farina1709.com","fashionnova.com","fatface.com","febreze.com","feelunique.com","fender.com","fentybeauty.com","fenwick.co.uk","ferrino.it","fido.ca","fiio.com","fila.com","finish.fr","finishline.com","firebox.com","firstcry.com","fissler.com","fitshop.de","fivebelow.com","fiverr.com","fix-price.com","fjallraven.com","flaconi.de","flipkart.com","florislondon.com","floydhome.com","flyingtiger.com","fnac.com","foodcity.com","footasylum.com","footlocker.com","forever21.com","formlabs.com","fossil.com","fox.co.il","foyles.co.uk","fr.shopping.rakuten.com","frame.work","frasers.com","fredericks.com","fredmeyer.com","freedompress.org.uk","freepeople.com","fressnapf.de","fritzhansen.com","fromourplace.com","fruit.com","functionofbeauty.com","furla.com","g2000.com.hk","galaxus.ch","galerieslafayette.com","game.co.uk","game.es","gamestop.com","gant.com","gap.com","garrard.com","gattinoni.com","gaystheword.co.uk","gear4music.com","geekompc.com","gekas.se","georgjensen.com","geox.com","giant-bicycles.com","giant.sg","gianttiger.com","gievesandhawkes.com","gigantti.fi","gillette.com","ginatricot.com","giordano.com","girbaud.com","givenchy.com","gladday.ca","glassons.com","global.oliveyoung.com","globus.de","glossier.com","gmarket.co.kr","gnc.com","goat.com","godaddy.com","godiva.com","goflink.com","gog.com","goldengoose.com","goldsmiths.co.uk","gooutdoors.co.uk","gottex.co.il","gouletpens.com","graeters.com","grailed.com","gray-nicolls.co.uk","graza.co","graze.com","greenmangaming.com","groceries.morrisons.com","groceryoutlet.com","groupon.com","grovemade.com","guardian.com.sg","gucci.com","gudrunsjoden.com","guitarcenter.com","gum.ru","gumtree.com","gusmayer.com","gymboree.com","gymshark.com","habitat.co.uk","hagebau.com","haizol.com","halfords.com","hallmark.com","hamleys.com","hammacher.com","hangten.com","hankyu-dept.co.jp","hannaandersson.com","happysocks.com","harborfreight.com","hardybrothers.com.au","harley-davidson.com","harmontblaine.com","harrisscarfe.com.au","harrods.com","harrys.com","hartstores.com","harveynichols.com","harveynorman.com.au","hauslabs.com","havaianas.com.br","havan.com.br","haworth.com","hayashi.com.tw","headandshoulders.com","heb.com","heelys.com","heinz.com","hellofresh.com","hellomolly.com","henrypoole.com","hepsiburada.com","hermanmiller.com","hermes.com","herschel.com","hersheyland.com","herveleger.com","hexclad.com","hickeyfreeman.com","hipermaxi.com","hktvmall.com","hm.com","hmart.com","hmv.com","hobbs.com","hobbycraft.co.uk","hobbylobby.com","hoka.com","hollandandbarrett.com","hollandandbarrett.nl","hollisterco.com","home24.de","homebase.co.uk","homedepot.ca","homedepot.com","homegoods.com","homehardware.ca","homesense.ie","honest.com","honestjons.com","honeywell.com","hornbach.de","horze.com","hostinger.com","hottopic.com","hp.com","hpb.com","hsamuel.co.uk","hsn.com","hstern.com.br","htc.com","hubo.be","hubo.nl","huel.com","hugendubel.de","hugoboss.com","huion.com","humanic.net","humblebundle.com","hummel.net","hunkemoller.be","huntsmansavilerow.com","hurley.com","hushpuppies.com","hydroflask.com","ica.se","iceberg.com","iceland.co.uk","idealo.it","iherb.com","iittala.com","ikea.com","iliabeauty.com","illum.dk","illumsbolighus.no","ilva.dk","independenttrucks.com","indigo.ca","ingles-markets.com","inglot.pl","innisfree.com","instacart.com","interflora.co.uk","intersport.com","intimissimi.com","irobot.com","irshad.az","isetan.mistore.jp","ito-ya.co.jp","itoyokado.co.jp","izod.com","jabra.com","jack-wolfskin.com","jackjones.com","jackrabbittradingpost.com","jaeger-lecoultre.com","jagermeister.com","jako-o.com","jansport.com","jarir.com","jbhifi.com.au","jcpenney.com","jcrew.com","jd.com","jdsports.co.uk","jeancoutu.com","jetpens.com","jigsaw-online.com","jiomart.com","jlindebergusa.com","joann.com","johnlewis.com","jojomamanbebe.com","joker.no","jomalone.com","joom.com","joop.com","jordache.com","joules.com","journeys.com","joybird.com","joybuy.com","jp.mercari.com","juicycouture.com","julius-keilwerth.com","jumbo.cl","jumbo.com","jumia.co.ke","jumia.com.eg","jumia.com.ng","jumia.ma","juno.co.uk","jwpepper.com","k-books.co.jp","k-y.com","kadewe.de","kalles.se","kalyanjewellers.net","kangol.com","kappahl.com","karhu.com","karkkainen.com","karlkani.com","katespade.com","kathmandu.co.nz","kathmandu.com.au","kaufhaus-tyrol.at","kaufland.de","kawasaki.com","kay.com","kenzo.com","keyfood.com","kiabi.com","kiehls.com","kijiji.ca","kik.de","kikki-k.com","kikocosmetics.com","kingkullen.com","kinokuniya.com","kirklands.com","kith.com","kiton.com","kiwi.no","kktctelsim.com","kleinanzeigen.de","kmart.com.au","kobo.com","koh-i-noor.cz","kohls.com","komplett.no","konzum.hr","kookai.fr","kosas.com","koton.com","kroger.com","kupetzeliseevs.ru","kusmitea.com","kuzina.ru","kyivstar.ua","kyliecosmetics.com","kyobobook.co.kr","la-z-boy.com","labello.com","lacoste.com","laderach.com","lakmeindia.com","lamartina.com","lancel.com","lanerossi.com","lanvin.com","lavieclaire.com","lazada.co.id","lazada.co.th","lazada.com.my","lazada.com.ph","lazada.sg","lazada.vn","lcwaikiki.com","leatherman.com","leboncoin.fr","lecoqsportif.com","lecreuset.com","leesfamousrecipe.com","lego.com","lelabofragrances.com","lenovo.com","leroymerlin.fr","leuchtturm1917.com","levelshoes.com","levi.com","lg.com","lgb.com","libertylondon.com","librairieleuguelionne.com","libresse.com","lidl.com","lidl.de","ligne-roset.com","liligo.com","limitedrungames.com","lincraft.com.au","lindex.com","liquiddeath.com","lista.com","littlewoods.com","liujo.com","liverpool.com.mx","loaf.com","loake.co.uk","loblaws.ca","loccitane.com","lockhatters.com","loewe.com","logitech.com","lojasrenner.com.br","long-mcquade.com","longchamp.com","lookfantastic.com","lordandtaylor.com","lotte.co.jp","lotteon.com","lottusse.com","lotuss.com","louis.de","louisvuitton.com","lowes.com","lubin.eu","lucozade.com","luisaviaroma.com","lukfook.com","luluhypermarket.com","lumene.com","lush.com","maccosmetics.com","macron.com","macys.com","made.com","madewell.com","magasin.dk","magazineluiza.com.br","maglite.com","maisonsdumonde.com","maje.com","makerbot.com","makro.co.za","mamasandpapas.com","manic-panic.info","manor.ch","manscaped.com","manufactum.de","marantz.com","marc-o-polo.com","marksandspencer.com","marktplaats.nl","marmot.com","marshalls.com","massimodutti.com","matahari.com","matalan.co.uk","matchesfashion.com","matieresfecales.com","matsukiyo.hk","matsuyafoods.co.jp","matsuzakaya.co.jp","mauboussin.fr","mavi.com","maxbrenner.com","maxeda.nl","maxfashion.com","maxonfx.com","mcs.com","mec.ca","mecca.com","meccano.com","mediamarkt.de","meesho.com","mega-image.ro","meijer.com","mejuri.com","memoryexpress.com","menards.com","menkind.co.uk","meny.dk","mercadolibre.cl","mercadolibre.com.ar","mercadolibre.com.co","mercadolibre.com.mx","mercadolivre.com.br","mercadona.es","mercari.com","mercator.si","meritbeauty.com","merrell.com","metalsucks.com","metaportalhelp.com","metro.ca","mexx.com","mi.com","michaelhill.com.au","michaelkors.com","michaels.com","microcenter.com","microsoft.com","migros.ch","migros.com.tr","mikimoto.com","miniso.com","missguided.com","missoma.com","mitre10.co.nz","mitsubishi-fuso.com","miumiu.com","mixmarkt.eu","mmfoodmarket.com","moldcell.md","moleskine.com","moltonbrown.co.uk","momoshop.com.tw","moncler.com","monicavinader.com","monki.com","monoprice.com","monsterstore.com","montblanc.com","moonboot.com","moosejaw.com","mora.jp","morleys.co.uk","morrisons.com","moschino.com","moscot.com","mothercare.com","motsbouche.com","mountainwarehouse.com","mpreis.at","mrclean.com","mrp.com","mrporter.com","mrtoys.com.au","msmode.nl","mudwtr.com","muji.com","muji.us","mulberry.com","mumzworld.com","munichsports.com","musiciansfriend.com","musinsa.com","mvideo.ru","mvmt.com","myer.com.au","myntra.com","myprotein.com","myrenova.com","myspringfield.com","mytheresa.com","mytoys.de","n11.com","na-kd.com","namshi.com","napaonline.com","napapijri.com","napster.com","nastygal.com","nationalbookstore.com","nationalrail.co.uk","nativecos.com","nativeunion.com","naturalgrocers.com","neimanmarcus.com","nespresso.com","net-a-porter.com","netgear.com","newbalance.com","newchic.com","newegg.com","newlook.com","newworld.co.nz","newyaohan.com","next.co.uk","nhs-inc.com","nike.com","ninaricci.com","nintendo.com","nitori-net.jp","nkd.it","nocibe.fr","noelleeming.co.nz","nomadgoods.com","noon.com","nordstrom.com","nordstromrack.com","northsails.com","notebooksbilliger.de","nothing.tech","notino.com","notino.ua","notonthehighstreet.com","nudiejeans.com","nykaa.com","nyxcosmetics.de","oakfurnitureland.co.uk","obeyclothing.com","obi.de","obs.no","ocado.com","off---white.com","offerup.com","office.co.uk","officedepot.com","officeworks.com.au","okq8.se","olaplex.com","olay.com","oldnavy.gap.com","oliverbonas.com","ollies.com","ollies.us","olx.com","olx.ro","omsom.com","on.com","one.nz","oneill.com","onepeloton.com","oneplus.com","onida.com","onitsukatiger.com","oodji.com","openbazaar.org","opi.com","oreillyauto.com","oscaro.it","osim.com","osprey.com","otto.de","ounass.ae","outdoorvoices.com","overclockers.co.uk","overstock.com","oxfam.org.uk","palzileri.com","panda.com.sa","pandora.net","panduro.com","paperchase.com","parachutehome.com","parfois.com","parfums-de-marly.com","parfumscaron.com","paris-store.com","partycity.com","patagonia.com","patanjaliayurved.net","patrontequila.com","pbtech.co.nz","pccomponentes.com","pcrichard.com","peacocks.co.uk","peakdesign.com","penny.it","penshoppe.com","petbarn.com.au","petco.com","petit-bateau.com","petsathome.com","petsmart.ca","petsmart.com","petvalu.ca","pfunds.de","philips-hue.com","philips.com","phonehouse.es","piaget.com","picard.fr","picnic.app","pier1.com","pierrecardin.com","pimkie.fr","pinduoduo.com","pingodoce.pt","pisiffik.gl","platypusshoes.com.au","play-asia.com","playmobil.com","playstation.com","plazavea.com.pe","pnp.co.za","poggenpohl.com","polomarket.pl","poltronafrau.com","popmart.com","porrua.mx","ports1961.com","poshmark.com","potterybarn.com","potterybarnkids.com","poundland.co.uk","poundstretcher.co.uk","powell-peralta.com","powells.com","prada.com","praxis.nl","premier-percussion.com","prettylittlething.com","priceline.com.au","primark.com","primary.com","primevideo.com","princessauto.com","printemps.com","profilo.com","promod.com","publix.com","pullandbear.com","puma.com","puravidabracelets.com","purple.com","puuilo.fi","quiksilver.fr","quiktrip.com","quince.com","qvc.com","radpowerbikes.com","rakuten.co.jp","ralphlauren.com","rapha.cc","rarebeauty.com","raspberrypi.com","rawlings.com","razer.com","rebelsport.com.au","redbubble.com","redmart.lazada.sg","redwingshoes.com","reebok.com","regatta.com","rei.com","reiss.com","reitmans.com","reliancedigital.in","rema.no","rembeauty.com","renault-trucks.fr","renuar.co.il","repco.com.au","replayjeans.com","reserved.com","reusch.com","reverb.com","revlon.com","revolve.com","revox.com","revzilla.com","rh.com","rhodeskin.com","riachuelo.com.br","ridge.com","rimi.lv","rimmellondon.com","rinascente.it","ring.com","ripcurl.com","riteaid.com","riverisland.com","robertdyas.co.uk","robertsradio.com","rockauto.com","rockport.com","rogerdubuis.com","roguefitness.com","roku.com","romancoppolastudio.com","romwe.com","rona.ca","ronaldvanderkemp.com","roomandboard.com","roomstogo.com","roots.com","rosebikes.de","rossmann.de","rossstores.com","rothys.com","roughtrade.com","rover.com","roxy.fr","royalcopenhagen.com","ruggable.com","rusta.com","ryman.co.uk","saatva.com","sacai.jp","safaricom.co.ke","safeway.com","sainsburys.co.uk","saksfifthavenue.com","salamander.de","salomon.com","salsajeans.com","samsclub.com","samsung.com","sandeman.com","sandro-paris.com","saregama.com","sarenza.com","sasa.com","saturn.de","saucony.com","savagex.com","sayweee.com","scalperscompany.com","scan.co.uk","scarpa.com","schick.com","schiesser.com","schottnyc.com","schuh.co.uk","screwfix.com","sea-doo.brp.com","sea.com","sears.com.mx","seasaltcornwall.com","secretlab.co","sectornolimits.com","sees.com","seikowatches.com","selfridges.com","selters.de","selver.ee","sephora.co.uk","sephora.com","sephora.fr","sergiorossi.com","sezane.com","shakespeareandcompany.com","shanghaitang.com","shapeways.com","sharkninja.com","shein.com","shop-apotheke.com","shop.lululemon.com","shop.mango.com","shop.mattel.com","shop.rewe.de","shopbop.com","shopcider.com","shopee.co.id","shopee.co.th","shopee.com.br","shopee.com.my","shopee.com","shopee.ph","shopee.sg","shopee.tw","shopee.vn","shopify.com","shopmyexchange.com","shoppersdrugmart.ca","shopping.yahoo.co.jp","showpo.com","siam.com.ar","sierrasprings.com","sillybandzonline.com","silvan.dk","simons.ca","simple.ripley.cl","sinsay.com","sisley-paris.com","size.co.uk","sk-ii.com","skateparkoftampa.com","skechers.com","skims.com","skroutz.gr","sleepnumber.com","slickdeals.net","smartandfinal.com","smnovella.com","smsupermalls.com","smyk.com","smythstoys.com","snapdeal.com","snipes.com","sobeys.com","soliver.com","soliver.de","sonos.com","sostrenegrene.com","sotka.fi","soylent.com","spacenk.com","spanx.com","sparkfun.com","specialized.com","sport-saller.de","sport-thieme.de","sportchek.ca","sportsdirect.com","spotahome.com","spotlightstores.com","sprouts.com","ssense.com","st-dupont.com","stanfords.co.uk","stanley1913.com","staples.ca","staples.com","steelseries.com","stefanel.com","steffl-vienna.at","steiff.com","steimatzky.co.il","steinmart.com","sterno.com","stetson.com","stevemadden.com","stihl.com","stockx.com","stokomani.fr","store.epicgames.com","store.google.com","store.playstation.com","store.steampowered.com","stories.com","stradivarius.com","strauss.com","structube.com","studenac.hr","stussy.com","stylevana.com","subito.it","suitsupply.com","summerfridays.com","suning.com","suomalainen.com","superbalist.com","supercheapauto.com.au","superdrug.com","superdry.com","superga.com","supergoop.com","swappa.com","swarovski.com","swatch.com","sweetwater.com","swiggy.com","system76.com","systembolaget.se","t2tea.com","takashimaya.co.jp","takealot.com","takko.com","tanishq.co.in","taobao.com","target.com.au","target.com","tatacliq.com","taylorstitch.com","tchibo.com","tedbaker.com","teegschwendner.de","teknikmagasinet.se","telkom.co.za","templeandwebster.com.au","tempurpedic.com","temu.com","tentree.com","ternbicycles.com","tesco.com","teufel.ch","tezenis.com","thalia.de","thebay.com","thebodyshop.com","thebrick.com","thefreshmarket.com","thegoodguys.com.au","thehalara.com","theiconic.com.au","thekooples.com","thenorthface.com","theordinary.com","therealreal.com","thermofisher.com","theskinfood.com","thetoyshop.com","thewarehouse.co.nz","thewhitecompany.com","thomann.de","thomaspink.com","thorntons.co.uk","thorsteinar.de","thredup.com","thriftbooks.com","thrivemarket.com","thunderdome.com","tia.com.ec","tiffany.com","tigerofsweden.com","tiki.vn","timberland.com","tirerack.com","tissotwatches.com","tjhughes.co.uk","tjmaxx.tjx.com","tkmaxx.com","tmall.com","tmlewin.co.uk","tokmanni.fi","tokopedia.com","tom-tailor.com","tommy.com","tommybahama.com","tonyschocolonely.com","toolstation.com","topshop.com","topsmarkets.com","toryburch.com","totalwine.com","tower28beauty.com","toysrus.com","toyworld.com.au","tractorsupply.com","traderjoes.com","trekbikes.com","trendyol.com","trentlimited.com","trudon.com","truefittandhill.com","trumpers.com","trussardi.com","tsuentea.ca","tsum.ru","tuftandneedle.com","turnbullandasser.com","tv.rakuten.co.jp","tvsmotor.com","twgtea.com","uae.sharafdg.com","ugg.com","ugreen.com","uk.webuy.com","ulefone.com","ulta.com","ultimateears.com","umidigi.com","uncommongoods.com","underarmour.com","unieuro.it","uniqlo.com","universalstore.com","uny.co.jp","upim.com","upwork.com","urbanoutfitters.com","us.princesspolly.com","uwajimaya.com","uzum.uz","valentino.com","vanlaack.com","vanmoof.com","vans.com","vaude.com","veganz.de","veja-store.com","verabradley.com","verkkokauppa.com","vertbaudet.fr","very.co.uk","vestiairecollective.com","viagogo.com","vicks.com","victoriassecret.com","victorioylucchino.com","vidaxl.de","videotron.com","viewsonic.com","viki.com","viking-direct.co.uk","viktor-rolf.com","vinmonopolet.no","vinted.com","violetteandco.com","vip.com","virginplus.ca","visions.ca","vitacost.com","vive.com","vkusvill.ru","volvotrucks.com","vons.com","voxamps.co.uk","vuoriclothing.com","wacoal-america.com","waitrose.com","wako.co.jp","walgreens.com","walmart.ca","walmart.com.mx","walmart.com","warbyparker.com","wartski.com","watchesofswitzerland.com","waterford.com","waterstones.com","watier.com","watsons.com.sg","wayfair.com","webtoons.com","weekday.com","wefashion.com","wegmans.com","weleda.com","wellcome.com.hk","wesc.uk","westelm.com","westmarine.com","westwing.de","which.co.uk","whistles.com","wholefoodsmarket.com","whsmith.co.uk","wickedweasel.com","wickes.co.uk","wiggle.com","wildone.com","wilkinsonsword.com","willhaben.at","williamrast.com","williams-sonoma.com","wine-searcher.com","winndixie.com","wish.com","witchery.com.au","witt-weiden.de","wob.com","wolford.com","woolworths.co.nz","woolworths.co.za","woolworths.com.au","woot.com","worldmarket.com","worten.pt","xbox.com","xxl.no","yankeecandle.com","yeezy.com","yemeksepeti.com","yenny-elateneo.com","yeoldecuriosityshop.com","yesstyle.com","yeti.com","yliopistonapteekki.fi","yodobashi.com","yoigo.com","ysl.com","yurindo.co.jp","zaful.com","zalando.co.uk","zalando.com","zalando.de","zales.com","zappos.com","zara.com","zarahome.com","zeeman.com","zellers.com","zennioptical.com","zlatarnacelje.com","zooplus.com","zooplus.es","zozo.jp","zumiez.com","zwilling.com"];
})();
