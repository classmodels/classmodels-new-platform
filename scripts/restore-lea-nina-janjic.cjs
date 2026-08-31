'use strict';
/**
 * Eenmalig herstel: Lea-Nina Janjic per ongeluk hard-delete op live.
 * Idempotent: als het account al bestaat, gebeurt er niets.
 */
const PAYLOAD = {"user":{"id":"7e9e64d3-9996-471f-bcf9-fc8ead5d9645","email":"elsverheyen@yahoo.fr","passwordHash":"$2b$10$vvQEe7eFvw/W456oveDCj.ds.4QC1WqTBobze/NR2.W5UN2/JED6C","firstName":"Lea-Nina","lastName":"Janjic","phone":"+32472761645","bio":null,"companyName":null,"clientProfile":null,"status":"active","defaultPortal":"model","isPremium":false,"premiumUntil":null,"premiumOverride":false,"mollieCustomerId":null,"legacyWpUserId":55,"profilePhotoAssetId":"443f7b5a-494d-4e1a-aa96-f8d4e93ecc0d","modelSheet":{"land":"België","maat":"S","bhMaat":"75C","lengte":"155 cm","straat":"Rijgelstraat 20","taille":"70","tiktok":"","overMij":"Ik ben een pittige meid die graag voor de camera staat. Ik doe aan toestelturnen en zing in een koor.","facebook":"","gemeente":"Veltem","geslacht":["vrouw"],"gsmModel":"+32472761645","gsmVader":"","postcode":"3020","gsmMoeder":"+32468169564","haarkleur":"Donker goudblond","instagram":"","jeansmaat":"34","kleurOgen":"Blauw","ervaringen":"Ik heb nog geen shows gelopen, maar heb wel reeds opleiding gevolgd bij het modellenbureau en sta ingepland voor de show in maart 2026.","heupomtrek":"90","schoenmaat":"38","beschikbaar":["Modeshows","Foto opdrachten","Reklame"],"borstomtrek":"88","confectiemaat":"S","geboortedatum":"2012-12-23","nationaliteit":"België","rekeningnummer":"BE"},"lastLoginAt":null,"mustChangePassword":false,"setCardFreeOrder":false,"setCardAllowReorder":false,"createdAt":"2026-05-13T15:26:11.170Z","updatedAt":"2026-05-23T17:38:50.590Z"},"roleSlugs":["model","newface","tryout"],"media":[{"id":"11dfcae7-c4b2-4738-9cd0-d8f154e69819","originalName":"class-models-lea-nina-janjic-g2960-wp-import.jpg","storageKey":"f596562b-c52f-43ac-a497-aff6bb5a5ec1.jpg","mimeType":"image/jpeg","sizeBytes":74269,"width":682,"height":1024,"webpKey":"f596562b-c52f-43ac-a497-aff6bb5a5ec1.webp","thumbKey":"f596562b-c52f-43ac-a497-aff6bb5a5ec1_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.761Z"},{"id":"14a9c3e2-baf9-46de-a70b-c0a670a9779b","originalName":"class-models-lea-nina-janjic-g2964-wp-import.jpg","storageKey":"1a9e96e5-baaa-4a62-a96a-6d9b3279db92.jpg","mimeType":"image/jpeg","sizeBytes":104751,"width":682,"height":1024,"webpKey":"1a9e96e5-baaa-4a62-a96a-6d9b3279db92.webp","thumbKey":"1a9e96e5-baaa-4a62-a96a-6d9b3279db92_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:48.471Z"},{"id":"30679b0c-9378-45b4-98da-58d912d6f289","originalName":"class-models-lea-nina-janjic-g2959-wp-import.jpg","storageKey":"c1e52d27-7c62-409e-a130-e6dd63d0650c.jpg","mimeType":"image/jpeg","sizeBytes":95216,"width":682,"height":1024,"webpKey":"c1e52d27-7c62-409e-a130-e6dd63d0650c.webp","thumbKey":"c1e52d27-7c62-409e-a130-e6dd63d0650c_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.597Z"},{"id":"338e5ab6-ca59-4f10-99a9-6cf2d9244e05","originalName":"class-models-lea-nina-janjic-g2963-wp-import.jpg","storageKey":"9a8aeebb-500d-4174-ad27-ee13f82dc149.jpg","mimeType":"image/jpeg","sizeBytes":164861,"width":682,"height":1024,"webpKey":"9a8aeebb-500d-4174-ad27-ee13f82dc149.webp","thumbKey":"9a8aeebb-500d-4174-ad27-ee13f82dc149_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:48.299Z"},{"id":"443f7b5a-494d-4e1a-aa96-f8d4e93ecc0d","originalName":"class-models-lea-nina-janjic-wp-import.jpg","storageKey":"45293224-80e1-443d-82b4-9b5e798029a1.jpg","mimeType":"image/jpeg","sizeBytes":141649,"width":682,"height":1024,"webpKey":"45293224-80e1-443d-82b4-9b5e798029a1.webp","thumbKey":"45293224-80e1-443d-82b4-9b5e798029a1_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T15:43:26.936Z"},{"id":"4e8fdba3-3f31-44a7-927a-e68d438dd134","originalName":"class-models-lea-nina-janjic-g2958-wp-import.jpg","storageKey":"d3e8e008-04db-4a26-b5aa-5ca9e9d209f1.jpg","mimeType":"image/jpeg","sizeBytes":89691,"width":682,"height":1024,"webpKey":"d3e8e008-04db-4a26-b5aa-5ca9e9d209f1.webp","thumbKey":"d3e8e008-04db-4a26-b5aa-5ca9e9d209f1_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.422Z"},{"id":"5b0b14c7-4ea2-47f2-94c3-bef44f3ba8a2","originalName":"class-models-lea-nina-janjic-g2956-wp-import.jpg","storageKey":"2a8d712f-59ec-4846-a8f6-71384bbe0194.jpg","mimeType":"image/jpeg","sizeBytes":125869,"width":682,"height":1024,"webpKey":"2a8d712f-59ec-4846-a8f6-71384bbe0194.webp","thumbKey":"2a8d712f-59ec-4846-a8f6-71384bbe0194_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.083Z"},{"id":"711dbe50-d30f-4e0e-aca6-0ac3ef4a1456","originalName":"class-models-lea-nina-janjic-g2961-wp-import.jpg","storageKey":"0a71d8fc-95aa-4d0d-b13e-dbf07febe269.jpg","mimeType":"image/jpeg","sizeBytes":77371,"width":682,"height":1024,"webpKey":"0a71d8fc-95aa-4d0d-b13e-dbf07febe269.webp","thumbKey":"0a71d8fc-95aa-4d0d-b13e-dbf07febe269_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.930Z"},{"id":"7a59e7b9-652f-422e-84ed-1bd8f156a924","originalName":"class-models-lea-nina-janjic-g2965-wp-import.jpg","storageKey":"6c49377d-24b4-414f-9855-d8f275422b29.jpg","mimeType":"image/jpeg","sizeBytes":92474,"width":682,"height":1024,"webpKey":"6c49377d-24b4-414f-9855-d8f275422b29.webp","thumbKey":"6c49377d-24b4-414f-9855-d8f275422b29_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:48.644Z"},{"id":"bdfb809b-54a1-4380-93eb-21aa2b4cda89","originalName":"class-models-lea-nina-janjic-g2957-wp-import.jpg","storageKey":"2b1da476-0769-45b2-a157-9dc8a260fb47.jpg","mimeType":"image/jpeg","sizeBytes":71728,"width":682,"height":1024,"webpKey":"2b1da476-0769-45b2-a157-9dc8a260fb47.webp","thumbKey":"2b1da476-0769-45b2-a157-9dc8a260fb47_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:47.248Z"},{"id":"c81c2cb5-cf33-4def-a6bf-ecdcdeecf061","originalName":"class-models-lea-nina-janjic-g2962-wp-import.jpg","storageKey":"6c14c636-df0b-47e8-bb73-8c8b95ffe4e6.jpg","mimeType":"image/jpeg","sizeBytes":94931,"width":682,"height":1024,"webpKey":"6c14c636-df0b-47e8-bb73-8c8b95ffe4e6.webp","thumbKey":"6c14c636-df0b-47e8-bb73-8c8b95ffe4e6_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:48.104Z"},{"id":"dc52d1e9-8c4e-4ed6-b081-fee583fd90f2","originalName":"class-models-lea-nina-janjic-g2966-wp-import.jpg","storageKey":"168eb093-c565-4697-ad0f-61dad0f85d87.jpg","mimeType":"image/jpeg","sizeBytes":86288,"width":682,"height":1024,"webpKey":"168eb093-c565-4697-ad0f-61dad0f85d87.webp","thumbKey":"168eb093-c565-4697-ad0f-61dad0f85d87_thumb.webp","hardDeleted":false,"createdAt":"2026-05-13T16:42:48.810Z"}]};

async function restoreLeaNinaJanjic(prisma) {
  const id = PAYLOAD.user.id;
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (existing) {
    console.error('[combell] herstel Lea-Nina Janjic: staat al in de database');
    return;
  }
  const emailTaken = await prisma.user.findUnique({
    where: { email: PAYLOAD.user.email },
    select: { id: true },
  });
  if (emailTaken) {
    console.error('[combell] herstel Lea-Nina Janjic overgeslagen: e-mail bestaat al op ander id');
    return;
  }

  let legacyWpUserId = PAYLOAD.user.legacyWpUserId;
  if (legacyWpUserId != null) {
    const wpTaken = await prisma.user.findUnique({
      where: { legacyWpUserId },
      select: { id: true },
    });
    if (wpTaken) legacyWpUserId = null;
  }

  const modelsFolder = await prisma.mediaFolder.findUnique({
    where: { slug: 'models' },
    select: { id: true },
  });

  const { profilePhotoAssetId, ...userRow } = PAYLOAD.user;
  await prisma.user.create({
    data: {
      ...userRow,
      legacyWpUserId,
      profilePhotoAssetId: null,
    },
  });

  for (const slug of PAYLOAD.roleSlugs) {
    const role = await prisma.role.findUnique({ where: { slug }, select: { id: true } });
    if (!role) continue;
    await prisma.userRole.createMany({
      data: [{ userId: id, roleId: role.id }],
      skipDuplicates: true,
    });
  }

  for (const asset of PAYLOAD.media) {
    const taken = await prisma.mediaAsset.findUnique({
      where: { storageKey: asset.storageKey },
      select: { id: true },
    });
    if (taken) {
      await prisma.mediaAsset.update({
        where: { id: taken.id },
        data: { uploadedById: id, hardDeleted: false },
      });
      continue;
    }
    const idTaken = await prisma.mediaAsset.findUnique({
      where: { id: asset.id },
      select: { id: true },
    });
    if (idTaken) continue;
    await prisma.mediaAsset.create({
      data: {
        ...asset,
        folderId: modelsFolder ? modelsFolder.id : null,
        uploadedById: id,
        linkedModelUserId: null,
      },
    });
  }

  if (profilePhotoAssetId) {
    const photo = await prisma.mediaAsset.findUnique({
      where: { id: profilePhotoAssetId },
      select: { id: true },
    });
    if (photo) {
      await prisma.user.update({
        where: { id },
        data: { profilePhotoAssetId },
      });
    }
  }

  console.error('[combell] herstel Lea-Nina Janjic: account + ' + PAYLOAD.media.length + ' foto-records teruggezet');
}

module.exports = { restoreLeaNinaJanjic };
