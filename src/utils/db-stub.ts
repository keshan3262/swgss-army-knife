export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'svg';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Conversion {
  id: number;
  userId: number;
  destinationFormat: ImageFormat;
  status: 'pending' | 'completed' | 'failed';
  versions: {
    hashedOriginal: string;
    url: string;
  }[];
}

export class InvalidCursorError extends Error {
  constructor(message: string, public readonly value: string) {
    super(message);
  }
}

const dummyUsersFirstNames = [
  'Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivy', 'Jack', 'Kyle', 'Liam', 'Mia', 'Noah',
  'Olivia', 'Paul', 'Quinn', 'Ryan', 'Sarah', 'Terry', 'Uma', 'Violet', 'William', 'Xavier', 'Yvonne', 'Zach'
];
const dummyUsersLastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez'
];

const dummyUsers: User[] = dummyUsersFirstNames.flatMap((firstName, i) => dummyUsersLastNames.map((lastName, j) => ({
  id: i * dummyUsersLastNames.length + j + 1,
  username: `${firstName}${lastName}`.toLowerCase(),
  email: `${firstName}.${lastName}@example.com`
})));

const dummyConversions: Conversion[] = [
  {
    id: 1,
    userId: 1,
    destinationFormat: 'png',
    status: 'completed',
    versions: [
      {
        hashedOriginal: '3db1ce837b8b236b23f6583901b655102f4db6db736fa83906c73c782c366e8e.jpeg',
        url: 'https://somecdn.com/3db1ce837b8b236b23f6583901b655102f4db6db736fa83906c73c782c366e8e.png'
      },
      {
        hashedOriginal: 'e8403f70c9e648604d54e84b7bb361b5e157aa52d2d5a2a08c3d809be4b2166e.jpeg',
        url: 'https://somecdn.com/e8403f70c9e648604d54e84b7bb361b5e157aa52d2d5a2a08c3d809be4b2166e.png'
      }
    ]
  },
  {
    id: 2,
    userId: 1,
    destinationFormat: 'png',
    status: 'completed',
    versions: [
      {
        hashedOriginal: 'c64d6e664b29c417536a5bed554ae09db8d2a39d429caae0f413ffbf48711c3b.jpeg',
        url: 'https://somecdn.com/c64d6e664b29c417536a5bed554ae09db8d2a39d429caae0f413ffbf48711c3b.png'
      }
    ]
  },
  {
    id: 3,
    userId: 2,
    destinationFormat: 'webp',
    status: 'pending',
    versions: [
      {
        hashedOriginal: 'c56e3251b4cbb2d43ca6c2cb538b302d7ba0d93944fe2b19a88f82e1d0b24bba.jpeg',
        url: 'https://somecdn.com/c56e3251b4cbb2d43ca6c2cb538b302d7ba0d93944fe2b19a88f82e1d0b24bba.webp'
      },
      {
        hashedOriginal: '905cf0f01005865823cac0fa66352e119f78fad5abd358ccf92dc988e9e3571f.jpeg',
        url: ''
      }
    ]
  },
  {
    id: 4,
    userId: 2,
    destinationFormat: 'avif',
    status: 'completed',
    versions: [
      {
        hashedOriginal: 'a11942801b399aefb7a87ed26a3817504f0577ef64385aafc5e242b9f5750f18.jpeg',
        url: 'https://somecdn.com/a11942801b399aefb7a87ed26a3817504f0577ef64385aafc5e242b9f5750f18.avif'
      },
      {
        hashedOriginal: '229a4917b7c1fb3792b21a18e2999245b33812ddee7434be9455b91c097de1ed.jpeg',
        url: 'https://somecdn.com/229a4917b7c1fb3792b21a18e2999245b33812ddee7434be9455b91c097de1ed.avif'
      }
    ]
  },
  {
    id: 5,
    userId: 3,
    destinationFormat: 'webp',
    status: 'failed',
    versions: [
      {
        hashedOriginal: '9cc2f1c0f7179aa27f2d5aa6b0448fe71254618d027a970fb7528db5df44924c.png',
        url: ''
      }
    ]
  },
  {
    id: 6,
    userId: 3,
    destinationFormat: 'webp',
    status: 'completed',
    versions: [
      {
        hashedOriginal: '323e0bf0d52e1029d9e5f03b5e66cb8b246b64e35a258eea95884ab944fd38d6.png',
        url: 'https://somecdn.com/323e0bf0d52e1029d9e5f03b5e66cb8b246b64e35a258eea95884ab944fd38d6.webp'
      }
    ]
  }
];

let nextUserId = dummyUsers.length + 1;
let nextConversionId = dummyConversions.length + 1;

export const getUsers = async (limit: number, cursor: string | null) => {
  let startId: number;
  try {
    startId = cursor ? parseInt(atob(cursor)) : 0;

    if (startId < 0 || isNaN(startId)) {
      throw new Error('Invalid cursor');
    }
  } catch (error) {
    throw new InvalidCursorError((error as any).message, cursor!);
  }

  const itemsBeforeIndex = dummyUsers.findIndex(user => user.id === startId) + 1;
  const items = dummyUsers.slice(itemsBeforeIndex, itemsBeforeIndex + limit);
  const nextCursor = itemsBeforeIndex + limit < dummyUsers.length - 1
    ? btoa(dummyUsers[itemsBeforeIndex + limit - 1].id.toString())
    : null;
  
  return { items, next_cursor: nextCursor };
};

export const getUserById = async (id: number) => dummyUsers.find(user => user.id === id);

export const createUser = async (user: Omit<User, 'id'>) => {
  const newUser = {
    id: nextUserId++,
    ...user
  };
  dummyUsers.push(newUser);

  return newUser;
};

export const createConversion = async (
  conversion: Omit<Conversion, 'id' | 'status' | 'versions'> & { images: string[] }
) => {
  const { images, ...rest } = conversion;
  const newConversion: Conversion = {
    ...rest,
    id: nextConversionId++,
    status: 'pending',
    versions: images.map(image => ({
      hashedOriginal: image,
      url: ''
    }))
  };
  dummyConversions.push(newConversion);

  return newConversion;
};

export const getConversions = async (limit: number, cursor: string | null) => {
  let startId: number;
  try {
    startId = cursor ? parseInt(atob(cursor)) : 0;

    if (startId < 0 || isNaN(startId)) {
      throw new Error('Invalid cursor');
    }
  } catch (error) {
    throw new InvalidCursorError((error as any).message, cursor!);
  }
  
  const itemsBeforeIndex = dummyConversions.findIndex(conversion => conversion.id === startId) + 1;
  const items = dummyConversions.slice(itemsBeforeIndex, itemsBeforeIndex + limit);
  const nextCursor = itemsBeforeIndex + limit < dummyConversions.length - 1
    ? btoa(dummyConversions[itemsBeforeIndex + limit - 1].id.toString())
    : null;

  return { items, next_cursor: nextCursor };
};