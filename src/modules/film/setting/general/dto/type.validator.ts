import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'TypeValidator', async: false })
export class TypeValidator implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        return (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        );
    }

    defaultMessage(args: ValidationArguments) {
        return 'Value must be a string, number, or boolean';
    }
}
