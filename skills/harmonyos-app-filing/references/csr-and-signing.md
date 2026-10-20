# 签名证书与CSR生成指南

## 概念说明

| 术语 | 说明 |
|------|------|
| CSR (Certificate Signing Request) | 证书签名请求文件，提交给AGC用于签发证书 |
| .p12 / .jks | 密钥库文件，存储私钥，需要密码保护 |
| .cer / .crt | 证书文件，AGC签发后下载 |
| 公钥 (Public Key) | 从证书中提取，备案表单可能需要 |
| MD5指纹 | 证书的MD5哈希值，备案表单可能需要 |
| Profile | AGC中的配置文件，关联证书和应用，打包时需要 |

## 方式A: DevEco Studio 生成（推荐）

### 步骤

1. 打开 DevEco Studio
2. 菜单: **Build → Generate Key and CSR**
3. 填写密钥库信息:

| 字段 | 说明 | 示例 |
|------|------|------|
| Key store path | 保存路径 | `D:\project\cert\app.jks` |
| Password | 密钥库密码（记住！） | 自定义 |
| Confirm password | 确认密码 | 同上 |
| Key alias | 密钥别名 | `app_key` |
| Key password | 密钥密码 | 同上或另设 |
| Validity (years) | 有效期 | `25` |

4. 填写证书信息:

| 字段 | 说明 | 示例 |
|------|------|------|
| First and Last Name | 姓名 | 你的真实姓名 |
| Organizational Unit | 组织单位 | `Dev` |
| Organization | 组织 | `Personal` |
| City or Locality | 城市 | `Guiyang` |
| State or Province | 省份 | `Guizhou` |
| Country Code | 国家代码 | `CN` |

5. 点OK → 同时生成 `.jks` 和 `.csr`
6. 回到AGC上传 `.csr` 文件

### 优点
- 100%被AGC接受
- 同时生成密钥库，后续打包直接用
- 图形界面操作简单

---

## 方式B: OpenSSL 命令行生成

### 生成私钥
```bash
openssl genrsa -out private.key 2048
```

### 生成CSR
```bash
openssl req -new \
  -key private.key \
  -out app.csr \
  -sha256 \
  -utf8 \
  -subj "/C=CN/ST=Guizhou/L=Guiyang/O=Personal/OU=Development/CN=YourName/emailAddress=you@example.com"
```

### 验证CSR
```bash
openssl req -text -noout -in app.csr
```

### 注意
- OpenSSL生成的CSR可能被AGC拒绝
- 字段必须完整（C/ST/L/O/OU/CN/emailAddress）
- 使用SHA256签名算法
- 被拒绝后建议改用DevEco Studio

---

## 从证书/密钥库提取公钥和MD5

### 从.pem证书提取
```bash
# 公钥
openssl x509 -in cert.pem -noout -pubkey

# MD5指纹
openssl x509 -in cert.pem -noout -fingerprint -md5

# SHA256指纹
openssl x509 -in cert.pem -noout -fingerprint -sha256
```

### 从.p12密钥库提取（需要密码）
```bash
# 导出证书
openssl pkcs12 -in app.p12 -clcerts -nokeys -out cert.pem -passin pass:你的密码

# 获取MD5
openssl x509 -in cert.pem -noout -fingerprint -md5

# 获取公钥
openssl x509 -in cert.pem -noout -pubkey
```

### 从.jks密钥库提取
```bash
# 需要keytool（JDK自带）
keytool -list -v -keystore app.jks -storepass 你的密码
# 输出中包含 MD5、SHA1、SHA256 指纹
```

---

## 文件保管提醒

| 文件 | 重要性 | 说明 |
|------|--------|------|
| `.p12` / `.jks` 密钥库 | 极高 | 丢失后无法更新已上架的应用 |
| 密码 | 极高 | 与密钥库同等重要，建议物理记录 |
| `.csr` 文件 | 中 | 已用于AGC，但建议保留 |
| `.cer` 证书 | 中 | AGC签发，可重新下载 |
| `private.key` | 极高 | OpenSSL方式生成的私钥，绝不能泄露 |

**建议**: 将密钥库文件和密码备份到安全位置（加密压缩 + 多处存储）。

---

## AGC Profile 创建

拿到签名证书后还需要创建Profile:

1. AGC → 「证书、APP ID和Profile」→「Profile」
2. 新建Profile
3. 关联: 你的应用 + 刚创建的签名证书
4. 类型选「发布」
5. 下载 `.p7b` 文件
6. 在DevEco Studio中配置签名信息
7. 打包 `.app` 文件

### DevEco Studio 签名配置
1. File → Project Structure → Signing Configs
2. 填入:
   - Store file: `.jks` 或 `.p12` 路径
   - Store password: 密钥库密码
   - Key alias: 密钥别名
   - Key password: 密钥密码
   - Sign alg: SHA256withRSA
3. Build → Generate Signed Bundle/Hap → 选择Profile → 生成发布包
