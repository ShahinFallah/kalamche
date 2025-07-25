import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectTaggingCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { IS3Config, S3Config } from "src/config/s3.config";
import { KalamcheError, KalamcheErrorType } from "src/filters/exception";
import { IS3Service } from "../interfaces/services/IS3Service";

export class S3Service implements IS3Service {
  private client: S3Client;

  constructor(@S3Config() private config: IS3Config) {
    this.client = new S3Client({
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKey!,
        secretAccessKey: this.config.secretKey!,
      },
      forcePathStyle: this.config.usePathStyle,
      region: this.config.region!,
    });

    this.#init();
  }

  async #init() {
    try {
      const bucketCommand = new HeadBucketCommand({
        Bucket: this.config.bucketName,
      });
      // throws error if not exists
      await this.client.send(bucketCommand);
    } catch (error: unknown) {
      try {
        const bucketCommand = new CreateBucketCommand({
          Bucket: this.config.bucketName,
        });
        await this.client.send(bucketCommand);

        // minio wont work with this lifecycle configuration
        // in production i will use s3 so for dev we ignore
        if (process.env.NODE_ENV === "production") {
          // delete temp files after 24 hours
          await this.#initLifecycle();
        }
      } catch (error: unknown) {
        throw new KalamcheError(KalamcheErrorType.S3ReqFailed, error);
      }
    }
  }

  async #initLifecycle() {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: this.config.bucketName,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "DeleteTempFilesAfter24Hours",
            Status: "Enabled",
            Filter: {
              And: {
                Tags: [
                  {
                    Key: "temp",
                    Value: "true",
                  },
                ],
              },
            },
            Expiration: {
              Days: 1,
            },
          },
        ],
      },
    });
    await this.client.send(command);
  }

  async putObject(
    id: string,
    mimeType: string,
    buffer: Buffer,
    temp: boolean = true,
  ) {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: id,
      Body: buffer,
      ContentType: mimeType,
      Tagging: temp ? "temp=true" : "temp=false",
    });

    try {
      await this.client.send(command);
      const url = `${this.config.endpoint}/${this.config.bucketName}/${id}`;
      return url;
    } catch (error: unknown) {
      throw new KalamcheError(KalamcheErrorType.S3ReqFailed, error);
    }
  }

  async delete(id: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: id,
    });

    try {
      await this.client.send(command);
    } catch (error: unknown) {
      throw new KalamcheError(KalamcheErrorType.S3ReqFailed, error);
    }
  }

  async updateObjectTag(fileId: string, key: string, value: string) {
    // in development we use minio and minio dose not support s3 tagging system
    if (key === "temp" && process.env.NODE_ENV !== "production") {
      return;
    }

    try {
      const getTagCommand = new GetObjectTaggingCommand({
        Bucket: this.config.bucketName,
        Key: fileId,
      });

      const existingTag = await this.client.send(getTagCommand);
      const updatedTags = existingTag.TagSet?.map((tag) => {
        if (tag.Key === key) {
          return { Key: key, Value: value };
        }
        return tag;
      });

      if (!updatedTags!.some((tag) => tag.Key === key)) {
        updatedTags!.push({ Key: key, Value: value });
      }

      const putTagCommand = new PutObjectTaggingCommand({
        Bucket: this.config.bucketName,
        Key: fileId,
        Tagging: {
          TagSet: updatedTags,
        },
      });
      await this.client.send(putTagCommand);
    } catch (error) {
      throw new KalamcheError(KalamcheErrorType.S3ReqFailed, error);
    }
  }
}
