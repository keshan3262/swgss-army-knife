import type { dataSource } from './data-source';
import { User } from './entities/user';
import { Conversion } from './entities/conversion';
import { ConvertedVersion } from './entities/converted-version';
import { ConversionStatus, ImageFormat } from './entities/enums';

export async function seed(ds: typeof dataSource) {
  await ds.query('DROP TABLE IF EXISTS converted_versions, source_images, conversions, users CASCADE');
  await ds.synchronize();

  const users = await ds.getRepository(User).save([
    { email: 'alice.smith1@example.com', username: 'alice_smith1' },
    { email: 'bob.johnson2@example.com', username: 'bob_johnson2' },
    { email: 'charlie.williams3@example.com', username: 'charlie_williams3' },
    { email: 'dave.jones4@example.com', username: 'dave_jones4' },
    { email: 'eve.garcia5@example.com', username: 'eve_garcia5' }
  ]);
  const conversions = await ds.getRepository(Conversion).save([
    {
      user: users[0],
      destinationFormat: ImageFormat.PNG,
      status: ConversionStatus.PENDING,
      sourceImages: [
        {
          format: ImageFormat.SVG,
          originalName: 'img1.svg',
          size: '1000',
          storageUrl: 'https://example.com/img1.svg'
        }
      ]
    },
    {
      user: users[1],
      destinationFormat: ImageFormat.WEBP,
      status: ConversionStatus.PENDING,
      sourceImages: [
        {
          format: ImageFormat.PNG,
          originalName: 'img2.png',
          size: '2000',
          storageUrl: 'https://example.com/img2.png'
        },
        {
          format: ImageFormat.JPEG,
          originalName: 'img3.jpeg',
          size: '3000',
          storageUrl: 'https://example.com/img3.jpeg'
        }
      ]
    },
    {
      user: users[2],
      destinationFormat: ImageFormat.JPEG,
      status: ConversionStatus.COMPLETED,
      sourceImages: [
        {
          format: ImageFormat.PNG,
          originalName: 'img4.png',
          size: '4000',
          storageUrl: 'https://example.com/img4.png'
        },
        {
          format: ImageFormat.JPEG,
          originalName: 'img5.jpeg',
          size: '5000',
          storageUrl: 'https://example.com/img5.jpeg'
        },
        {
          format: ImageFormat.PNG,
          originalName: 'img6.png',
          size: '6000',
          storageUrl: 'https://example.com/img6.png'
        }
      ]
    },
    {
      user: users[3],
      destinationFormat: ImageFormat.SVG,
      status: ConversionStatus.PENDING,
      sourceImages: [
        {
          format: ImageFormat.SVG,
          originalName: 'img1.svg',
          size: '1000',
          storageUrl: 'https://example.com/img1-2.svg'
        }
      ]
    },
    {
      user: users[3],
      destinationFormat: ImageFormat.GIF,
      status: ConversionStatus.FAILED,
      sourceImages: [
        {
          format: ImageFormat.SVG,
          originalName: 'img7.svg',
          size: '7000',
          storageUrl: 'https://example.com/img7.svg',
          conversionError: 'Conversion failed'
        },
        {
          format: ImageFormat.SVG,
          originalName: 'img8.svg',
          size: '8000',
          storageUrl: 'https://example.com/img8.svg'
        },
        {
          format: ImageFormat.PNG,
          originalName: 'img9.png',
          size: '9000',
          storageUrl: 'https://example.com/img9.png'
        },
        {
          format: ImageFormat.JPEG,
          originalName: 'img10.jpeg',
          size: '10000',
          storageUrl: 'https://example.com/img10.jpeg'
        }
      ]
    }
  ]);
  await ds.getRepository(ConvertedVersion).save([
    {
      sourceImage: conversions[1].sourceImages[0],
      format: ImageFormat.WEBP,
      size: '1000',
      storageUrl: 'https://example.com/img2.webp'
    },
    {
      sourceImage: conversions[2].sourceImages[0],
      format: ImageFormat.JPEG,
      size: '4000',
      storageUrl: 'https://example.com/img4.jpeg'
    },
    {
      sourceImage: conversions[2].sourceImages[1],
      format: ImageFormat.JPEG,
      size: '5000',
      storageUrl: 'https://example.com/img5.jpeg'
    },
    {
      sourceImage: conversions[2].sourceImages[2],
      format: ImageFormat.JPEG,
      size: '6000',
      storageUrl: 'https://example.com/img6.png'
    },
    {
      sourceImage: conversions[4].sourceImages[1],
      format: ImageFormat.GIF,
      size: '8000',
      storageUrl: 'https://example.com/img8.gif'
    }
  ]);
}
