import * as React from 'react';
import uuid from 'uuid';
import { IntlShape, useIntl } from 'react-intl';
import { find, map } from 'lodash';
import { useMutation } from '@apollo/client';
import { Button, DropdownList, Loader, Banner, Input, Tags, Text, Attachments, Notification } from '@testlio/panthera';
import { TAttachment } from '@testlio/panthera/dist/patterns/Attachments';
import MarkDownContent from 'components/MarkDownContent';
import { createUploadServiceUrls } from 'tmt/mutations/createUploadServiceUrls';
import constants from './constants';

import messages from './messages';

const styles = require('./styles.less');

enum SeverityKey {
    High = 'high',
    Medium = 'medium',
    Low = 'low'
}

interface ISeverity {
    key: SeverityKey;
    value: string;
}

const SEVERITIES: ISeverity[] = [
    { key: SeverityKey.High, value: 'High' },
    { key: SeverityKey.Medium, value: 'Medium' },
    { key: SeverityKey.Low, value: 'Low' }
];

const IssueForm = (props) => {
    const {
        issueCollection,
        issueSubmitHref,
        handleSubmit,
        error,
        loading,
        project,
        client,
        user,
        runNumber,
        showDevices
    } = props;

    const intl: IntlShape = useIntl();
    const { features, labels } = issueCollection;
    const projectLabels = labels.map((label) => ({ key: label, value: label }));
    const projectFeatures = features.map((feature) => ({ key: feature.id, value: feature.name }));
    const userDevices = user?.devices?.map((device) => {
        return {
            key: uuid(),
            value: `${device?.model?.manufacturer} ${device?.model?.model} ${device?.operatingSystem?.name} ${device?.operatingSystem?.version}`,
            operatingSystem: {
                href: device?.operatingSystem?.href
            },
            model: {
                href: device?.model?.href
            }
        };
    });

    const projectBuildVersions = project?.buildVersions?.map((version) => ({ key: version, value: version }));
    const isBuildVersionsEnabled = project?.isBuildVersionEnabled && !!projectBuildVersions?.length;

    const [buildVersions, setBuildVersions] = React.useState<any>([]);
    const [title, setTitle] = React.useState<string>(null);
    const [severity, setSeverity] = React.useState<any>(null);
    const [feature, setFeature] = React.useState<any>(null);
    const [selectedLabels, setSelectedLabels] = React.useState<any>([]);
    const descriptionTemplate = project?.issueTemplates?.submission;
    const [description, setDescription] = React.useState<string>(descriptionTemplate);
    const [attachments, setAttachments] = React.useState<TAttachment[]>([]);
    const [device, setDevice] = React.useState<any>(null);
    const selectedFeature = find(features, { id: feature?.key });

    const [uploadRef, setUploadRef] = React.useState(null);

    const [createUploadUrlsMutation] = useMutation(createUploadServiceUrls.query, { client });

    const getUploadUrls = async () => {
        try {
            const {
                data: { createFileUploadUrls }
            } = await createUploadUrlsMutation(
                createUploadServiceUrls.createOptions(constants.attachments.DEFAULT_ATTACHMENT_PREFIX)
            );
            return createFileUploadUrls;
        } catch (err) {
            Notification.open({
                key: 'uploadServiceUrlsGetError',
                message: intl.formatMessage(messages.uploadServiceUrlsGetError),
                placement: 'bottomCenter',
                variant: 'danger',
                action: {
                    text: intl.formatMessage(messages.close),
                    closeOnClick: true
                }
            });
        }
    };

    const onSubmitForm = async () => {
        const issueData = {
            title,
            description,
            severity: severity?.key,
            feature: selectedFeature
                ? {
                      href: selectedFeature?.href,
                      name: selectedFeature?.name,
                      path: selectedFeature?.path
                  }
                : null,
            labels: selectedLabels.map((label) => label.value),
            buildVersion: buildVersions?.map((version) => version.value),
            runNumber
        };
        return handleSubmit(issueSubmitHref, issueData, attachments, device);
    };

    const attachmentInProgress = attachments.some((attachment) => attachment.uploading);

    const submitDisabled =
        !severity ||
        (!feature && projectFeatures.length) ||
        !labels.length ||
        !description?.trim().length ||
        !title?.trim().length ||
        (!device && showDevices) ||
        attachmentInProgress ||
        (isBuildVersionsEnabled && !buildVersions.length);

    const onRemoveLabel = (option) => {
        setSelectedLabels(selectedLabels.filter((value) => value.key !== option.key));
    };

    const onAddLabel = (isChecked, option) => {
        if (!isChecked) return onRemoveLabel(option);
        const optionValue = option.tmpValue ? option.tmpValue : option.value;
        setSelectedLabels([...selectedLabels, { key: option.key, value: optionValue }]);
    };

    const onRemoveBuildVersion = (option) => {
        setBuildVersions(buildVersions.filter((value) => value.key !== option.key));
    };

    const onSelectBuildVersion = (isChecked, option) => {
        if (!isChecked) return onRemoveBuildVersion(option);
        setBuildVersions([...buildVersions, { key: option.key, value: option.value }]);
    };

    const getBuildVersionsButtonValue = () => {
        if (!buildVersions || !buildVersions.length) return intl.formatMessage(messages.affectedVersion);
        if (buildVersions.length === 1) return buildVersions[0].value;
        return `${buildVersions[0].value} +${buildVersions.length - 1}`;
    };

    const onChange = (changedAttachment: TAttachment) => {
        setAttachments((oldAttachments) => {
            const index = oldAttachments.findIndex((element) => element.id === changedAttachment.id);
            const copyAttachments = [...oldAttachments];
            if (index > -1) {
                copyAttachments[index] = { ...changedAttachment, assetHref: changedAttachment.url };
            }
            return copyAttachments;
        });
    };

    const onAdd = (attachment: TAttachment) => {
        if (attachment.size >= constants.attachments.MAX_ATTACHMENT_SIZE) {
            Notification.open({
                key: 'fileSizeError',
                message: intl.formatMessage(messages.fileSizeError, { fileName: attachment.name }),
                placement: 'bottomCenter',
                variant: 'danger',
                action: {
                    text: intl.formatMessage(messages.close),
                    closeOnClick: true
                }
            });
            throw new Error();
        }
        setAttachments((oldAttachments) => [...oldAttachments, attachment]);
    };

    const onDelete = (deletedAttachment: TAttachment) => {
        if (deletedAttachment.uploading) {
            setAttachments((oldAttachments) => {
                return oldAttachments.filter((attachment) => {
                    return attachment.id !== deletedAttachment.id;
                });
            });
            return;
        }
        setAttachments((oldAttachments) => {
            const index = oldAttachments.findIndex((element) => element.id === deletedAttachment.id);
            const copyAttachments = [...oldAttachments];
            if (index > -1) {
                copyAttachments.splice(index, 1);
            }
            return copyAttachments;
        });
    };

    return (
        <div className={styles.issueForm}>
            <Loader loading={loading}>
                {!!error && (
                    <div className={styles.submitError}>
                        <Banner icon='risk' type='danger' title={error.message} />
                    </div>
                )}
                <div>
                    <DropdownList
                        data={SEVERITIES}
                        selectedRowKeys={[severity?.key]}
                        width='md'
                        onSelect={(__, item) => setSeverity(item)}
                    >
                        <span>
                            <Button variant='outline' iconRight='dropdown' value={severity?.value || 'Severity'} />
                        </span>
                    </DropdownList>
                    <DropdownList
                        data={projectFeatures}
                        selectedRowKeys={[feature?.key]}
                        width='md'
                        onSelect={(__, item) => setFeature(item)}
                    >
                        <span>
                            <Button
                                variant='outline'
                                iconRight='dropdown'
                                value={feature?.value || 'Affected feature'}
                            />
                        </span>
                    </DropdownList>
                    {showDevices && (
                        <DropdownList
                            data={userDevices}
                            selectedRowKeys={[device?.key]}
                            width='md'
                            onSelect={(__, item) => setDevice(item)}
                        >
                            <span>
                                <Button variant='outline' iconRight='dropdown' value={device?.value || 'Device'} />
                            </span>
                        </DropdownList>
                    )}
                    {isBuildVersionsEnabled && (
                        <div className={styles.affectedVersion}>
                            <DropdownList
                                data={projectBuildVersions}
                                selectedRowKeys={map(buildVersions, 'key')}
                                width='md'
                                onSelect={onSelectBuildVersion}
                            >
                                <span>
                                    <Button
                                        variant='outline'
                                        iconRight='dropdown'
                                        value={getBuildVersionsButtonValue()}
                                    />
                                </span>
                            </DropdownList>
                        </div>
                    )}
                </div>
                <div className={styles.labelInput}>
                    <Text variant='overline' color='sky-darkest'>
                        {intl.formatMessage(messages.labels)}
                    </Text>
                    <Tags
                        data={[...projectLabels, ...selectedLabels]}
                        selected={selectedLabels}
                        onRemove={onRemoveLabel}
                        onSelect={onAddLabel}
                    />
                </div>
                <Input
                    autoSize
                    selectAllOnFocus
                    defaultValue={title}
                    size='lg'
                    onChange={setTitle}
                    className={styles.titleInput}
                    placeholder={intl.formatMessage(messages.titlePlaceholder)}
                />
                <div className={styles.descriptionWrapper}>
                    <MarkDownContent
                        onChange={setDescription}
                        text={description}
                        minRows={20}
                        placeholder={intl.formatMessage(messages.descriptionPlaceholder)}
                        loading={false}
                    />
                </div>
                <div className={styles.attachmentsWrapper}>
                    <Attachments
                        attachments={attachments}
                        onChange={(file) => onChange(file)}
                        onAdd={(file) => onAdd(file)}
                        onDelete={(file) => onDelete(file)}
                        uploadButtonRef={uploadRef}
                        addFileEnabled
                        deleteEnabled
                        display='rows'
                        getUploadUrls={() => getUploadUrls()}
                    />
                    <Button
                        ref={setUploadRef}
                        iconLeft='attach-file'
                        variant='plain'
                        className={styles.rowAttachmentsAddButton}
                    >
                        {intl.formatMessage(messages.attachFile)}
                    </Button>
                </div>
                <Button
                    disabled={submitDisabled}
                    loading={attachmentInProgress}
                    onClick={onSubmitForm}
                    variant='primary'
                    className={styles.saveBtn}
                >
                    {intl.formatMessage(messages.createButtonTitle)}
                </Button>
            </Loader>
        </div>
    );
};

export default IssueForm;
