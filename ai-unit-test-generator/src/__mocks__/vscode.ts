const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockCreateDirectory = jest.fn().mockResolvedValue(undefined);
const mockStat = jest.fn().mockRejectedValue(new Error('File not found'));

export const workspace = {
    workspaceFolders: [],
    fs: {
        writeFile: mockWriteFile,
        createDirectory: mockCreateDirectory,
        stat: mockStat
    }
};

export const Uri = {
    file: jest.fn((path: string) => ({ fsPath: path }))
};

export const EventEmitter = jest.fn();
