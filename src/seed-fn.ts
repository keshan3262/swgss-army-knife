import type { dataSource } from './data-source';
import { User } from './entities/user';
import { ConvertedVersion } from './entities/converted-version';
import { ConversionStatus, ImageFormat } from './entities/enums';
import { SourceImage } from './entities/source-image';

export async function seed(ds: typeof dataSource, addConversions = true) {
  const { identifiers: users } = await ds.getRepository(User).upsert([
    { email: 'alice.smith1@example.com', username: 'alice_smith1', ptsLeft: 10 },
    { email: 'bob.johnson2@example.com', username: 'bob_johnson2', ptsLeft: 10 },
    { email: 'charlie.williams3@example.com', username: 'charlie_williams3', ptsLeft: 10 },
    { email: 'dave.jones4@example.com', username: 'dave_jones4', ptsLeft: 10 },
    { email: 'eve.garcia5@example.com', username: 'eve_garcia5', ptsLeft: 10 }
  ], ['email']);
  await ds.query(`INSERT INTO conversion_handlers (id, name, source_formats, destination_formats, pts_left)
    VALUES
      (1, 'oxipng', ARRAY['png'::public.conversion_handlers_source_formats_enum], ARRAY['png'::public.conversion_handlers_destination_formats_enum], 10),
      (2, 'svgo', ARRAY['svg'::public.conversion_handlers_source_formats_enum], ARRAY['svg'::public.conversion_handlers_destination_formats_enum], 10)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      source_formats = EXCLUDED.source_formats,
      destination_formats = EXCLUDED.destination_formats,
      pts_left = EXCLUDED.pts_left
    RETURNING id`);

  if (!addConversions) {
    return;
  }

  const values = [
    { id: '1', user_id: users[0].id, destination_format: ImageFormat.PNG, status: ConversionStatus.PENDING },
    { id: '2', user_id: users[1].id, destination_format: ImageFormat.WEBP, status: ConversionStatus.PENDING },
    { id: '3', user_id: users[2].id, destination_format: ImageFormat.JPEG, status: ConversionStatus.COMPLETED },
    { id: '4', user_id: users[3].id, destination_format: ImageFormat.SVG, status: ConversionStatus.PENDING },
    { id: '5', user_id: users[3].id, destination_format: ImageFormat.GIF, status: ConversionStatus.FAILED },
    { id: '6', user_id: users[3].id, destination_format: ImageFormat.GIF, status: ConversionStatus.FAILED }
  ];
  let k = 1;
  let args: any[] = [];
  let templateString = '';
  for (let i = 0; i < values.length; i++) {
    templateString += '(';
    const row = values[i];
    const rowValues = Object.values(row);
    for (let j = 0; j < rowValues.length; j++) {
      templateString += `$${k++}`;
      if (j < rowValues.length - 1) {
        templateString += ', ';
      }
      args.push(rowValues[j]);
    }
    templateString += ')';
    if (i < values.length - 1) {
      templateString += ', ';
    }
  }
  const conversions = await ds.query(
    `INSERT INTO conversions (id, user_id, destination_format, status)
     VALUES ${templateString}
     ON CONFLICT (id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       destination_format = EXCLUDED.destination_format,
       status = EXCLUDED.status
     RETURNING id`,
    args
  );
  const { identifiers: sourceImages } = await ds.getRepository(SourceImage).upsert(
    [
      {
        conversion: conversions[0],
        format: ImageFormat.SVG,
        originalName: 'img1.svg',
        size: '1000',
        storageUrl: 'https://example.com/img1.svg'
      },
      {
        conversion: conversions[1],
        format: ImageFormat.PNG,
        originalName: 'img2.png',
        size: '2000',
        processed: 1,
        storageUrl: 'https://example.com/img2.png'
      },
      {
        conversion: conversions[1],
        format: ImageFormat.JPEG,
        originalName: 'img3.jpeg',
        size: '3000',
        storageUrl: 'https://example.com/img3.jpeg'
      },
      {
        conversion: conversions[2],
        format: ImageFormat.PNG,
        originalName: 'img4.png',
        size: '4000',
        processed: 1,
        storageUrl: 'https://example.com/img4.png'
      },
      {
        conversion: conversions[2],
        format: ImageFormat.JPEG,
        originalName: 'img5.jpeg',
        size: '5000',
        processed: 1,
        storageUrl: 'https://example.com/img5.jpeg'
      },
      {
        conversion: conversions[2],
        format: ImageFormat.PNG,
        originalName: 'img6.png',
        size: '6000',
        processed: 1,
        storageUrl: 'https://example.com/img6.png'
      },
      {
        conversion: conversions[3],
        format: ImageFormat.SVG,
        originalName: 'img1.svg',
        size: '1000',
        storageUrl: 'https://example.com/img1-2.svg'
      },
      {
        conversion: conversions[4],
        format: ImageFormat.SVG,
        originalName: 'img7.svg',
        size: '7000',
        processed: 1,
        storageUrl: 'https://example.com/img7.svg',
        conversionError: 'Conversion failed'
      },
      {
        conversion: conversions[4],
        format: ImageFormat.SVG,
        originalName: 'img8.svg',
        size: '8000',
        processed: 1,
        storageUrl: 'https://example.com/img8.svg'
      },
      {
        conversion: conversions[4],
        format: ImageFormat.PNG,
        originalName: 'img9.png',
        size: '9000',
        storageUrl: 'https://example.com/img9.png'
      },
      {
        conversion: conversions[4],
        format: ImageFormat.JPEG,
        originalName: 'img10.jpeg',
        size: '10000',
        storageUrl: 'https://example.com/img10.jpeg'
      },
      {
        conversion: conversions[5],
        format: ImageFormat.SVG,
        originalName: 'img11.svg',
        processed: 1,
        size: '11000',
        storageUrl: 'https://example.com/img11.svg',
        conversionError: 'Conversion failed'
      }
    ],
    ['storageUrl']
  );
  await ds.getRepository(ConvertedVersion).upsert([
    {
      sourceImage: sourceImages[1],
      format: ImageFormat.WEBP,
      size: '1000',
      storageUrl: 'https://example.com/img2.webp'
    },
    {
      sourceImage: sourceImages[3],
      format: ImageFormat.JPEG,
      size: '4000',
      storageUrl: 'https://example.com/img4.jpeg'
    },
    {
      sourceImage: sourceImages[4],
      format: ImageFormat.JPEG,
      size: '5000',
      storageUrl: 'https://example.com/img5.jpeg'
    },
    {
      sourceImage: sourceImages[5],
      format: ImageFormat.JPEG,
      size: '6000',
      storageUrl: 'https://example.com/img6.png'
    },
    {
      sourceImage: sourceImages[8],
      format: ImageFormat.GIF,
      size: '8000',
      storageUrl: 'https://example.com/img8.gif'
    }
  ], ['storageUrl']);
}
